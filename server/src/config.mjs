/**
 * All settings come from the environment (Railway variables). The OpenRouter
 * key exists only here; it is never logged, returned or sent anywhere except
 * OpenRouter's Authorization header.
 */
import { ROUTINE_IMPORT_LIMITS } from './stack/routineImportProtocol.mjs';

export const DEFAULT_MODEL = 'google/gemini-3.1-flash-lite';

const integer = (env, name, fallback, min, max) => {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be a whole number from ${min} to ${max}.`);
  }
  return value;
};

const flag = (env, name, fallback) => {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  if (/^(1|true|yes|on)$/i.test(raw)) return true;
  if (/^(0|false|no|off)$/i.test(raw)) return false;
  throw new Error(`${name} must be true or false.`);
};

export const loadConfig = (env = process.env) => ({
  port: integer(env, 'PORT', 8080, 1, 65535),
  openRouterApiKey: env.OPENROUTER_API_KEY?.trim() || null,
  openRouterBaseUrl: (env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, ''),
  /** Change the model on Railway without touching the app. */
  model: env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
  /** Optional OpenRouter provider sort: price | throughput | latency. */
  providerSort: env.OPENROUTER_PROVIDER_SORT?.trim() || null,
  /** Route only to providers that don't store or train on prompts. */
  denyDataCollection: !flag(env, 'OPENROUTER_ALLOW_DATA_COLLECTION', false),
  reasoning: flag(env, 'OPENROUTER_REASONING', false),
  maxOutputTokens: integer(env, 'OPENROUTER_MAX_OUTPUT_TOKENS', 8000, 256, 64000),
  /** One AI attempt; a second attempt shares the same overall deadline. */
  aiTimeoutMs: integer(env, 'AI_TIMEOUT_MS', 60_000, 1000, 120_000),
  requestDeadlineMs: integer(env, 'REQUEST_DEADLINE_MS', 90_000, 1000, 180_000),
  maxAttempts: integer(env, 'AI_MAX_ATTEMPTS', 2, 1, 3),
  maxTextLength: integer(env, 'MAX_TEXT_LENGTH', ROUTINE_IMPORT_LIMITS.maxTextLength, 100, ROUTINE_IMPORT_LIMITS.maxTextLength),
  maxBodyBytes: integer(env, 'MAX_BODY_BYTES', 64 * 1024, 1024, 1024 * 1024),
  rateLimitPerMinute: integer(env, 'RATE_LIMIT_PER_MINUTE', 10, 0, 10_000),
  /** If set, requests must send it as `x-stack-client-key`. */
  clientKey: env.STACK_CLIENT_KEY?.trim() || null,
  /** Trust the first X-Forwarded-For hop (Railway's proxy) for rate limiting. */
  trustProxy: flag(env, 'TRUST_PROXY', true),
});
