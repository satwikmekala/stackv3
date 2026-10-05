/**
 * One chat-completions call to OpenRouter. Errors carry a safe `code` for
 * the client and a `detail` for logs; neither ever contains the API key or
 * the pasted text.
 */
import { PROMPT_VERSION, ROUTINE_RESPONSE_FORMAT, SYSTEM_PROMPT } from './prompt.mjs';

export class AiError extends Error {
  /**
   * @param {string} code  ai_timeout | ai_unavailable | ai_rate_limited | ai_refused | invalid_model_output
   * @param {string} detail  log-only description
   * @param {{ retryable?: boolean, usage?: object | null }} [options]
   */
  constructor(code, detail, { retryable = false, usage = null } = {}) {
    super(detail);
    this.name = 'AiError';
    this.code = code;
    this.retryable = retryable;
    this.usage = usage;
  }
}

const readUsage = (body) => {
  const usage = body?.usage;
  if (!usage || typeof usage !== 'object') return null;
  const number = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
  return {
    promptTokens: number(usage.prompt_tokens),
    completionTokens: number(usage.completion_tokens),
    reasoningTokens: number(usage.completion_tokens_details?.reasoning_tokens),
    costUsd: number(usage.cost),
  };
};

/** Strips a ```json fence some models add even in JSON mode. */
const unfence = (content) => content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1');

/**
 * @param {{ text: string, config: ReturnType<typeof import('./config.mjs').loadConfig>, fetch: typeof fetch, timeoutMs: number }} input
 * @returns {Promise<{ json: unknown, usage: object | null, model: string | null, provider: string | null }>}
 */
export const requestRoutineParse = async ({ text, config, fetch, timeoutMs }) => {
  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0,
    max_tokens: config.maxOutputTokens,
    response_format: ROUTINE_RESPONSE_FORMAT,
    provider: {
      require_parameters: true,
      ...(config.denyDataCollection ? { data_collection: 'deny' } : {}),
      ...(config.providerSort ? { sort: config.providerSort } : {}),
    },
    reasoning: config.reasoning ? { enabled: true } : { enabled: false },
    usage: { include: true },
  };

  let response;
  try {
    response = await fetch(`${config.openRouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Stack routine import',
        'X-Stack-Prompt-Version': PROMPT_VERSION,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new AiError('ai_timeout', `OpenRouter did not respond within ${timeoutMs} ms`, { retryable: false });
    }
    throw new AiError('ai_unavailable', `OpenRouter request failed: ${error?.name ?? 'Error'}`, { retryable: true });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Handled by the status checks below.
  }
  if (!response.ok) {
    const providerMessage = typeof payload?.error?.message === 'string' ? payload.error.message.slice(0, 200) : '';
    const detail = `OpenRouter HTTP ${response.status}${providerMessage ? `: ${providerMessage}` : ''}`;
    if (response.status === 429) throw new AiError('ai_rate_limited', detail, { retryable: true });
    if (response.status === 408) throw new AiError('ai_timeout', detail, { retryable: true });
    throw new AiError('ai_unavailable', detail, { retryable: response.status >= 500 });
  }

  const usage = readUsage(payload);
  const choice = payload?.choices?.[0];
  const content = choice?.message?.content;
  if (payload?.error) throw new AiError('ai_unavailable', `OpenRouter error in body: ${String(payload.error.message ?? '').slice(0, 200)}`, { retryable: true, usage });
  if (choice?.finish_reason === 'length') throw new AiError('invalid_model_output', 'Model output was cut off (max tokens)', { retryable: true, usage });
  if (choice?.message?.refusal) throw new AiError('ai_refused', 'Model refused', { usage });
  if (typeof content !== 'string' || content.trim() === '') {
    throw new AiError('invalid_model_output', 'Model returned no content', { retryable: true, usage });
  }

  let json;
  try {
    json = JSON.parse(unfence(content));
  } catch {
    throw new AiError('invalid_model_output', 'Model returned text that is not JSON', { retryable: true, usage });
  }
  return {
    json,
    usage,
    model: typeof payload.model === 'string' ? payload.model : null,
    provider: typeof payload.provider === 'string' ? payload.provider : null,
  };
};
