/**
 * paste → parse (AI) → validate → resolve → result. Nothing is saved.
 */
import fs from 'node:fs';

import { AiError, requestRoutineParse } from './openrouter.mjs';
import { PROMPT_VERSION } from './prompt.mjs';
import { createExerciseResolver } from './stack/exerciseResolver.mjs';
import { readParsedRoutine } from './stack/routineImportProtocol.mjs';
import { buildRoutineImportResult } from './stack/routineImportResult.mjs';

export const STACK_CATALOG = JSON.parse(fs.readFileSync(new URL('./stack/catalog.json', import.meta.url), 'utf8'));

const AI_ERROR_RESPONSES = {
  ai_timeout: [504, 'Reading your routine took too long. Try again, or paste a shorter routine.'],
  ai_rate_limited: [503, 'Routine import is busy right now. Try again in a moment.'],
  ai_unavailable: [503, 'Routine import is unavailable right now. Try again later.'],
  ai_refused: [422, "This text couldn't be read as a workout routine."],
  invalid_model_output: [502, "Stack couldn't read this routine reliably. Try again."],
};

/** Removes a BOM and normalizes line endings; the text is otherwise untouched. */
export const normalizePastedText = (text) => text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

/**
 * @param {unknown} text
 * @param {number} maxLength
 * @returns {{ ok: true, text: string } | { ok: false, status: number, code: string, message: string }}
 */
export const validatePastedText = (text, maxLength) => {
  if (typeof text !== 'string') return { ok: false, status: 400, code: 'invalid_request', message: 'Send the routine as a "text" string.' };
  const normalized = normalizePastedText(text);
  if (normalized.trim().length === 0) return { ok: false, status: 400, code: 'empty_text', message: 'Paste a routine first.' };
  if (normalized.length > maxLength) {
    return { ok: false, status: 413, code: 'text_too_long', message: `Routines can be up to ${maxLength.toLocaleString('en-US')} characters.` };
  }
  return { ok: true, text: normalized };
};

const addUsage = (total, usage) => {
  if (!usage) return;
  for (const key of ['promptTokens', 'completionTokens', 'reasoningTokens', 'costUsd']) {
    if (typeof usage[key] === 'number') total[key] = (total[key] ?? 0) + usage[key];
  }
};

/**
 * @param {{ config: ReturnType<typeof import('./config.mjs').loadConfig>, fetch?: typeof fetch, now?: () => number, catalog?: object }} deps
 */
export const createRoutineImportService = ({ config, fetch = globalThis.fetch, now = () => performance.now(), catalog = STACK_CATALOG }) => {
  const resolver = createExerciseResolver(catalog);

  /**
   * @param {string} text already validated by `validatePastedText`
   */
  const parse = async (text) => {
    const started = now();
    const usage = {};
    const failures = [];
    let served = { model: null, provider: null };
    let lastError = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
      const remaining = started + config.requestDeadlineMs - now();
      if (remaining < 1000) break;
      try {
        const ai = await requestRoutineParse({ text, config, fetch, timeoutMs: Math.min(config.aiTimeoutMs, remaining) });
        addUsage(usage, ai.usage);
        served = { model: ai.model, provider: ai.provider };
        const read = readParsedRoutine(ai.json);
        if (!read.ok) {
          throw new AiError('invalid_model_output', `${read.error.message} (${read.error.path ?? 'root'})`, { retryable: true });
        }
        const result = buildRoutineImportResult(read.value, text, resolver, read.warnings);
        return {
          ok: true,
          result,
          meta: { model: config.model, servedModel: served.model, provider: served.provider, promptVersion: PROMPT_VERSION, attempts: attempt, failures, latencyMs: Math.round(now() - started), usage },
        };
      } catch (error) {
        if (!(error instanceof AiError)) throw error;
        addUsage(usage, error.usage);
        failures.push({ code: error.code, detail: error.message });
        lastError = error;
        if (!error.retryable) break;
      }
    }

    const code = lastError?.code ?? 'ai_timeout';
    const [status, message] = AI_ERROR_RESPONSES[code] ?? AI_ERROR_RESPONSES.ai_unavailable;
    return {
      ok: false,
      status,
      error: { code, message },
      meta: { model: config.model, servedModel: served.model, provider: served.provider, promptVersion: PROMPT_VERSION, attempts: failures.length, failures, latencyMs: Math.round(now() - started), usage },
    };
  };

  return { parse, resolver };
};
