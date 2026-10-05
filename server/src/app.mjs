/**
 * HTTP layer (node:http, no framework):
 *
 *   GET  /health
 *   POST /v1/routine-import/parse   { "text": "..." } → RoutineImportResult + meta
 *   POST /v1/routine-shares         V1 wire JSON → { id, url }
 *   GET  /v1/routine-shares/:id     → canonical V1 wire JSON
 *
 * Logs are one JSON line per request with sizes, timings, token usage and
 * match counts. The pasted text and model output are never logged, and every
 * logged string has the API key redacted as a last line of defence.
 */
import { Buffer } from 'node:buffer';
import { randomUUID, timingSafeEqual } from 'node:crypto';

import { createRoutineImportService, validatePastedText } from './routineImportService.mjs';
import { parseSharedSplitJson, serializeSharedSplit, SHARED_SPLIT_LIMITS, SHARED_SPLIT_VERSION } from './stack/splitProtocol.mjs';
import { persistRoutineShare, ROUTINE_SHARE_ID_PATTERN } from './routineShareStore.mjs';
import { appleAppSiteAssociation, SHARE_PREVIEW_PATH, SHARE_PREVIEW_IMAGE, sendRoutineSharePage } from './routineShareWeb.mjs';

const PARSE_ROUTE = '/v1/routine-import/parse';
const SHARES_ROUTE = '/v1/routine-shares';

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
    let exceeded = false;
    req.on('data', (chunk) => {
      if (exceeded) return;
      size += chunk.length;
      if (size > maxBytes) {
        exceeded = true;
        chunks.length = 0;
        reject(new BodyError(413, 'body_too_large', 'The request is too large.'));
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
 * shareStore is injected for tests; production supplies the persistent SQLite store.
 */
export const createApp = ({ config, shareStore = null, generateShareId, fetch = globalThis.fetch, log = (entry) => console.log(JSON.stringify(entry)), now = () => Date.now() }) => {
  const service = createRoutineImportService({ config, fetch });
  const rateLimit = createRateLimiter(config.rateLimitPerMinute, now);
  const shareRateLimit = createRateLimiter(config.routineShareRateLimitPerMinute, now);
  const redact = (value) =>
    config.openRouterApiKey && typeof value === 'string' ? value.split(config.openRouterApiKey).join('[redacted]') : value;
  const safeLog = (entry) => log(JSON.parse(JSON.stringify(entry, (_, value) => redact(value))));

  const clientAddress = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (config.trustProxy && typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
    return req.socket.remoteAddress ?? 'unknown';
  };

  const handleCreateShare = async (req, res, requestId) => {
    if (config.clientKey && !sameSecret(req.headers['x-stack-client-key'], config.clientKey)) {
      return sendError(res, 401, requestId, 'unauthorized', 'This client is not allowed to share routines.');
    }
    const limit = shareRateLimit(clientAddress(req));
    if (!limit.allowed) {
      return sendError(res, 429, requestId, 'rate_limited', 'Too many routine shares. Try again in a minute.', {
        'Retry-After': String(limit.retryAfterSeconds),
      });
    }
    if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
      return sendError(res, 415, requestId, 'unsupported_media_type', 'Send JSON.');
    }
    const raw = await readBody(req, SHARED_SPLIT_LIMITS.maxPayloadBytes);
    const parsed = parseSharedSplitJson(raw);
    if (!parsed.ok) {
      return sendError(res, parsed.error.code === 'payload_too_large' ? 413 : 400,
        requestId, parsed.error.code, 'This routine cannot be shared.');
    }
    // Reuse V1 normalization/privacy filtering and fixed-order serialization.
    const canonical = serializeSharedSplit(parsed.value);
    if (!canonical.ok) {
      return sendError(res, canonical.error.code === 'payload_too_large' ? 413 : 400,
        requestId, canonical.error.code, 'This routine cannot be shared.');
    }
    if (!shareStore) return sendError(res, 503, requestId, 'storage_unavailable', 'Routine sharing is temporarily unavailable.');
    const id = await persistRoutineShare(shareStore, canonical.value, SHARED_SPLIT_VERSION, generateShareId);
    return sendJson(res, 201, { id, url: `${config.routineSharePublicOrigin}/r/${id}` });
  };

  const handleReadShare = async (res, requestId, id) => {
    if (!ROUTINE_SHARE_ID_PATTERN.test(id)) {
      return sendError(res, 400, requestId, 'invalid_share_id', 'This share ID is malformed.');
    }
    if (!shareStore) return sendError(res, 503, requestId, 'storage_unavailable', 'Routine sharing is temporarily unavailable.');
    const payload = await shareStore.get(id);
    if (payload === null) return sendError(res, 404, requestId, 'share_not_found', 'This shared routine could not be found.');
    // Send exactly the stored canonical wire JSON (no domain shape or wrapper).
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(payload);
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
    const isWebShare = url.pathname === '/r' || url.pathname.startsWith('/r/');
    const isShareRoute = url.pathname === SHARES_ROUTE || url.pathname.startsWith(`${SHARES_ROUTE}/`) || isWebShare;
    const safePath = isWebShare ? '/r/:id' : isShareRoute && url.pathname !== SHARES_ROUTE ? `${SHARES_ROUTE}/:id` : url.pathname;
    const entry = { level: 'info', msg: 'request', requestId, method: req.method, path: safePath };
    res.setHeader('X-Request-Id', requestId);
    try {
      if (url.pathname === '/health' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, model: config.model, aiConfigured: Boolean(config.openRouterApiKey) });
      } else if (url.pathname === '/.well-known/apple-app-site-association') {
        if (!['GET', 'HEAD'].includes(req.method)) sendError(res, 405, requestId, 'method_not_allowed', 'Use GET.', { Allow: 'GET, HEAD' });
        else {
          const payload = JSON.stringify(appleAppSiteAssociation(config.stackIosAppId));
          res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload),
            'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
          res.end(req.method === 'HEAD' ? undefined : payload);
        }
      } else if (url.pathname === SHARE_PREVIEW_PATH && ['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': SHARE_PREVIEW_IMAGE.length,
          'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
        res.end(req.method === 'HEAD' ? undefined : SHARE_PREVIEW_IMAGE);
      } else if (isWebShare) {
        const id = url.pathname.slice(3);
        const page = (status, fields) => sendRoutineSharePage(res, status, { config, id, head: req.method === 'HEAD', ...fields });
        if (!['GET', 'HEAD'].includes(req.method)) {
          res.setHeader('Allow', 'GET, HEAD'); page(405, { error: 'broken' });
        } else if (!ROUTINE_SHARE_ID_PATTERN.test(id)) page(400, { error: 'broken' });
        else if (!shareStore) page(503, { error: 'failed' });
        else {
          const payload = await shareStore.get(id);
          if (payload === null) page(404, { error: 'missing' });
          else {
            const parsed = parseSharedSplitJson(payload);
            if (!parsed.ok) page(parsed.error.code === 'unsupported_version' ? 422 : 503,
              { error: parsed.error.code === 'unsupported_version' ? 'newer' : 'failed' });
            else page(200, { split: parsed.value });
          }
        }
      } else if (url.pathname === PARSE_ROUTE) {
        if (req.method !== 'POST') sendError(res, 405, requestId, 'method_not_allowed', 'Use POST.', { Allow: 'POST' });
        else await handleParse(req, res, requestId, entry);
      } else if (url.pathname === SHARES_ROUTE) {
        if (req.method !== 'POST') sendError(res, 405, requestId, 'method_not_allowed', 'Use POST.', { Allow: 'POST' });
        else await handleCreateShare(req, res, requestId);
      } else if (url.pathname.startsWith(`${SHARES_ROUTE}/`)) {
        if (req.method !== 'GET') sendError(res, 405, requestId, 'method_not_allowed', 'Use GET.', { Allow: 'GET' });
        else await handleReadShare(res, requestId, url.pathname.slice(SHARES_ROUTE.length + 1));
      } else {
        sendError(res, 404, requestId, 'not_found', 'Not found.');
      }
    } catch (error) {
      if (error instanceof BodyError) {
        if (!res.headersSent) sendError(res, error.status, requestId, error.code, error.message);
      } else {
        entry.level = 'error';
        // Storage errors may contain SQL values or bearer IDs. Never log them.
        entry.error = isShareRoute ? { code: 'routine_share_failure' } :
          { name: error?.name, message: String(error?.message ?? error).slice(0, 300) };
        const temporary = isShareRoute && [5, 6].includes(error?.errcode); // SQLITE_BUSY / SQLITE_LOCKED
        if (!res.headersSent) {
          if (isWebShare) sendRoutineSharePage(res, 503, { config, error: 'failed', head: req.method === 'HEAD' });
          else sendError(res, temporary ? 503 : 500, requestId,
            temporary ? 'storage_unavailable' : 'internal_error', 'Routine request failed. Try again.');
        }
      }
    } finally {
      entry.status = res.statusCode;
      entry.ms = Math.round(now() - started);
      if (url.pathname !== '/health') safeLog(entry);
    }
  };
};
