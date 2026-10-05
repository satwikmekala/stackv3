/**
 * Transport helpers around the canonical shared-split JSON.
 *
 * The protocol (`splitProtocol.ts`) owns what a shared split *is*; this file
 * only turns that canonical text into a compact URL-safe token and back. A
 * link, QR code, clipboard string, file or backend share token can all carry
 * the same token (or the raw JSON) without the protocol changing.
 *
 * UTF-8 and base64url are implemented here rather than via TextEncoder/atob so
 * behaviour is identical on Hermes, JSC and Node, and so decoding is strict:
 * non-canonical base64url and malformed UTF-8 are rejected, never repaired.
 */
import {
  parseSharedSplitJson,
  serializeSharedSplit,
  SHARED_SPLIT_LIMITS,
  type PortableSplit,
  type SharedSplitResult,
} from '@/features/sharing/splitProtocol';

/** Upper bound on token length implied by the JSON byte limit. */
export const MAX_SHARED_SPLIT_TOKEN_LENGTH = Math.ceil(
  (SHARED_SPLIT_LIMITS.maxPayloadBytes * 4) / 3
);

/** Custom-scheme import link handled by Expo Router's /import-split route. */
export const SPLIT_IMPORT_URL_BASE = 'stack://import-split';
export const SPLIT_IMPORT_QUERY_PARAM = 'd';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export const utf8Encode = (text: string): Uint8Array => {
  const bytes: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    let code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const low = text.charCodeAt(index + 1);
      if (!(low >= 0xdc00 && low <= 0xdfff)) throw new Error('Lone surrogate');
      code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error('Lone surrogate');
    }
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63)
      );
    }
  }
  return Uint8Array.from(bytes);
};

/** Strict UTF-8: rejects truncation, overlongs, surrogates and > U+10FFFF. */
export const utf8Decode = (bytes: Uint8Array): string | null => {
  let text = '';
  let index = 0;
  while (index < bytes.length) {
    const first = bytes[index];
    let length: number;
    let code: number;
    let min: number;
    if (first < 0x80) {
      text += String.fromCharCode(first);
      index += 1;
      continue;
    } else if (first >= 0xc2 && first <= 0xdf) {
      length = 2; code = first & 0x1f; min = 0x80;
    } else if (first >= 0xe0 && first <= 0xef) {
      length = 3; code = first & 0x0f; min = 0x800;
    } else if (first >= 0xf0 && first <= 0xf4) {
      length = 4; code = first & 0x07; min = 0x10000;
    } else {
      return null;
    }
    if (index + length > bytes.length) return null;
    for (let offset = 1; offset < length; offset += 1) {
      const next = bytes[index + offset];
      if ((next & 0xc0) !== 0x80) return null;
      code = (code << 6) | (next & 0x3f);
    }
    if (code < min || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return null;
    text += String.fromCodePoint(code);
    index += length;
  }
  return text;
};

/** Unpadded base64url (RFC 4648 §5). */
export const base64UrlEncode = (bytes: Uint8Array): string => {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const chunk = (bytes[index] << 16) | ((bytes[index + 1] ?? 0) << 8) | (bytes[index + 2] ?? 0);
    const remaining = bytes.length - index;
    output += ALPHABET[(chunk >> 18) & 63] + ALPHABET[(chunk >> 12) & 63];
    if (remaining > 1) output += ALPHABET[(chunk >> 6) & 63];
    if (remaining > 2) output += ALPHABET[chunk & 63];
  }
  return output;
};

/** Strict, canonical unpadded base64url. Returns null on any deviation. */
export const base64UrlDecode = (text: string): Uint8Array | null => {
  if (text.length % 4 === 1) return null;
  const values: number[] = [];
  for (const char of text) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) return null;
    values.push(value);
  }
  const bytes: number[] = [];
  for (let index = 0; index < values.length; index += 4) {
    const group = values.slice(index, index + 4);
    const chunk =
      (group[0] << 18) | (group[1] << 12) | ((group[2] ?? 0) << 6) | (group[3] ?? 0);
    bytes.push((chunk >> 16) & 255);
    if (group.length > 2) bytes.push((chunk >> 8) & 255);
    if (group.length > 3) bytes.push(chunk & 255);
    // Non-zero padding bits mean two different tokens could decode alike.
    if (group.length === 2 && (chunk & 0xffff) !== 0) return null;
    if (group.length === 3 && (chunk & 0xff) !== 0) return null;
  }
  return Uint8Array.from(bytes);
};

/** Portable split → validated canonical JSON → base64url token. */
export const encodeSharedSplit = (split: PortableSplit): SharedSplitResult<string> => {
  const serialized = serializeSharedSplit(split);
  if (!serialized.ok) return serialized;
  return { ok: true, value: base64UrlEncode(utf8Encode(serialized.value)) };
};

/** base64url token → strictly decoded JSON → validated portable split. */
export const parseSharedSplit = (token: unknown): SharedSplitResult<PortableSplit> => {
  if (typeof token !== 'string' || token.length === 0) {
    return { ok: false, error: { code: 'invalid_encoding', message: 'The shared split link is empty or malformed.' } };
  }
  if (token.length > MAX_SHARED_SPLIT_TOKEN_LENGTH) {
    return { ok: false, error: { code: 'payload_too_large', message: 'The shared split is too large.' } };
  }
  const bytes = base64UrlDecode(token);
  if (!bytes) {
    return { ok: false, error: { code: 'invalid_encoding', message: 'The shared split link is corrupted.' } };
  }
  const json = utf8Decode(bytes);
  if (json === null) {
    return { ok: false, error: { code: 'invalid_encoding', message: 'The shared split link is corrupted.' } };
  }
  return parseSharedSplitJson(json);
};

/** Builds `stack://import-split?d=<token>`; base64url needs no escaping. */
export const buildSplitImportUrl = (token: string, base = SPLIT_IMPORT_URL_BASE): string =>
  `${base}?${SPLIT_IMPORT_QUERY_PARAM}=${token}`;

/**
 * Pulls the token out of an import URL without relying on the platform URL
 * class (partial on Hermes). Returns null when the parameter is absent.
 */
export const readSplitImportToken = (url: string): string | null => {
  const queryStart = url.indexOf('?');
  if (queryStart < 0) return null;
  const fragmentStart = url.indexOf('#', queryStart);
  const query = url.slice(queryStart + 1, fragmentStart < 0 ? undefined : fragmentStart);
  for (const pair of query.split('&')) {
    const separator = pair.indexOf('=');
    const key = separator < 0 ? pair : pair.slice(0, separator);
    if (key === SPLIT_IMPORT_QUERY_PARAM) return separator < 0 ? '' : pair.slice(separator + 1);
  }
  return null;
};
