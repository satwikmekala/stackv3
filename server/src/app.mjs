/**
 * HTTP layer (node:http, no framework):
 *
 *   GET  /health
 *   POST /v1/routine-import/parse   { "text": "..." } → RoutineImportResult + meta
 *
 * Logs are one JSON line per request with sizes, timings, token usage and
 * match counts. The pasted text and model output are never logged, and every
 * logged string has the API key redacted as a last line of defence.
 */
import { Buffer } from 'node:buffer';
import { randomUUID, timingSafeEqual } from 'node:crypto';

import { createRoutineImportService, validatePastedText } from './routineImportService.mjs';

const PARSE_ROUTE = '/v1/routine-import/parse';

const sendJson = (res, status, body, headers = {}) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(payload);
};

const sendError = (res, status, requestId, code, message, headers) =>
  sendJson(res, status, { error: { code, message }, requestId }, headers);

class BodyError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const readBody = (req, maxBytes) =>
  new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) {
      reject(new BodyError(413, 'body_too_large', 'The request is too large.'));
      req.resume();
      return;
    }
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new BodyError(413, 'body_too_large', 'The request is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => reject(new BodyError(400, 'invalid_request', 'The request could not be read.')));
  });

const sameSecret = (provided, expected) => {
  if (typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Fixed one-minute windows per client address. */
const createRateLimiter = (perMinute, now) => {
  const windows = new Map();
  return (key) => {
    if (perMinute === 0) return { allowed: true };
    const minute = Math.floor(now() / 60_000);
    const entry = windows.get(key);
    if (!entry || entry.minute !== minute) {
      if (windows.size > 10_000) windows.clear();
      windows.set(key, { minute, count: 1 });
      return { allowed: true };
    }
    entry.count += 1;
    if (entry.count <= perMinute) return { allowed: true };
    return { allowed: false, retryAfterSeconds: 60 - Math.floor((now() / 1000) % 60) };
  };
};

/**
 * @param {{ config: ReturnType<typeof import('./config.mjs').loadConfig>, fetch?: typeof fetch, log?: (entry: object) => void, now?: () => number }} deps
 */
export const createApp = ({ config, fetch = globalThis.fetch, log = (entry) => console.log(JSON.stringify(entry)), now = () => Date.now() }) => {
  const service = createRoutineImportService({ config, fetch });
  const rateLimit = createRateLimiter(config.rateLimitPerMinute, now);
  const redact = (value) =>
    config.openRouterApiKey && typeof value === 'string' ? value.split(config.openRouterApiKey).join('[redacted]') : value;
  const safeLog = (entry) => log(JSON.parse(JSON.stringify(entry, (_, value) => redact(value))));

  const clientAddress = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (config.trustProxy && typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
    return req.socket.remoteAddress ?? 'unknown';
  };

  const handleParse = async (req, res, requestId, entry) => {
    if (config.clientKey && !sameSecret(req.headers['x-stack-client-key'], config.clientKey)) {
      return sendError(res, 401, requestId, 'unauthorized', 'This client is not allowed to import routines.');
    }
    const limit = rateLimit(clientAddress(req));
    if (!limit.allowed) {
      return sendError(res, 429, requestId, 'rate_limited', 'Too many routine imports. Try again in a minute.', {
        'Retry-After': String(limit.retryAfterSeconds),
      });
    }
    if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
      return sendError(res, 415, requestId, 'unsupported_media_type', 'Send JSON.');
    }
    const raw = await readBody(req, config.maxBodyBytes);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return sendError(res, 400, requestId, 'invalid_json', 'The request body is not valid JSON.');
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return sendError(res, 400, requestId, 'invalid_request', 'Send an object with a "text" string.');
    }
    const input = validatePastedText(Object.prototype.hasOwnProperty.call(body, 'text') ? body.text : undefined, config.maxTextLength);
    if (!input.ok) return sendError(res, input.status, requestId, input.code, input.message);
    entry.textChars = input.text.length;
    entry.textLines = input.text.split('\n').length;
    if (!config.openRouterApiKey) {
      return sendError(res, 503, requestId, 'ai_not_configured', 'Routine import is not configured on this server.');
    }

    const outcome = await service.parse(input.text);
    Object.assign(entry, {
      attempts: outcome.meta.attempts,
      failures: outcome.meta.failures,
      aiMs: outcome.meta.latencyMs,
      servedModel: outcome.meta.servedModel,
      provider: outcome.meta.provider,
      usage: outcome.meta.usage,
    });
    if (!outcome.ok) return sendError(res, outcome.status, requestId, outcome.error.code, outcome.error.message);
    entry.summary = outcome.result.summary;
    entry.warnings = outcome.result.warnings.map((warning) => warning.code);
    entry.importReady = outcome.result.importDraft.ready;
    // Failure details are for logs; the client only needs the outcome.
    const { failures: _failures, ...meta } = outcome.meta;
    return sendJson(res, 200, { ...outcome.result, meta: { requestId, ...meta } });
  };

  return async (req, res) => {
    const requestId = randomUUID();
    const started = now();
    const url = new URL(req.url ?? '/', 'http://localhost');
    const entry = { level: 'info', msg: 'request', requestId, method: req.method, path: url.pathname };
    res.setHeader('X-Request-Id', requestId);
    try {
      if (url.pathname === '/health' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, model: config.model, aiConfigured: Boolean(config.openRouterApiKey) });
      } else if (url.pathname === PARSE_ROUTE) {
        if (req.method !== 'POST') sendError(res, 405, requestId, 'method_not_allowed', 'Use POST.', { Allow: 'POST' });
        else await handleParse(req, res, requestId, entry);
      } else {
        sendError(res, 404, requestId, 'not_found', 'Not found.');
      }
    } catch (error) {
      if (error instanceof BodyError) {
        if (!res.headersSent) sendError(res, error.status, requestId, error.code, error.message);
      } else {
        entry.level = 'error';
        entry.error = { name: error?.name, message: String(error?.message ?? error).slice(0, 300) };
        if (!res.headersSent) sendError(res, 500, requestId, 'internal_error', 'Something went wrong.');
      }
    } finally {
      entry.status = res.statusCode;
      entry.ms = Math.round(now() - started);
      if (url.pathname !== '/health') safeLog(entry);
    }
  };
};
