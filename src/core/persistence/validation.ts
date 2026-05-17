/**
 * Hardening helpers cho persistence layer:
 *
 *   - validateStorageKey: chặn ký tự lạ trong storageKey (consumer-supplied) trước khi
 *     ghép vào key prefix (`whiteboard:scene:<key>`) hoặc dùng làm index trong IndexedDB.
 *   - safeParseScene: parse JSON với reviver loại bỏ `__proto__/constructor/prototype`
 *     để chặn prototype pollution, check max nesting depth, whitelist top-level keys.
 *
 * Các helper này không phụ thuộc DOM nên test được trong jsdom hoặc node thuần.
 */

const STORAGE_KEY_RE = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * Validate storageKey từ consumer.
 *
 * Format cho phép: chữ + số + underscore + dash, 1..128 ký tự.
 * Throw nếu không hợp lệ — caller bị buộc handle hoặc crash sớm.
 */
export function validateStorageKey(key: unknown): string {
  if (typeof key !== 'string' || !STORAGE_KEY_RE.test(key)) {
    const sample = key === undefined ? 'undefined' : String(key).slice(0, 32);
    throw new Error(
      `[whiteboard] Invalid storageKey: must match ${STORAGE_KEY_RE} (got: ${sample})`,
    );
  }
  return key;
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Reviver dùng cho `JSON.parse`: drop bất kỳ key nào trong DANGEROUS_KEYS,
 * tránh prototype pollution khi parse dữ liệu không tin cậy từ localStorage.
 */
function sanitizingReviver(_key: string, value: unknown): unknown {
  if (DANGEROUS_KEYS.has(_key)) return undefined;
  return value;
}

/** Max nesting depth cho scene tree (object/array). */
export const MAX_NESTED_DEPTH = 64;

function depthExceeds(v: unknown, max: number, depth = 0): boolean {
  if (depth > max) return true;
  if (v === null || typeof v !== 'object') return false;
  const children = Array.isArray(v)
    ? v
    : Object.values(v as Record<string, unknown>);
  for (const child of children) {
    if (depthExceeds(child, max, depth + 1)) return true;
  }
  return false;
}

const ALLOWED_TOP_LEVEL_KEYS = new Set(['version', 'elements', 'appState', 'savedAt']);

/** Shape của scene đã được validate (chưa check version + element shape — caller lo). */
export interface ParsedScene {
  version?: unknown;
  elements: unknown[];
  appState: Record<string, unknown>;
  savedAt?: unknown;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parse + sanitize raw JSON string từ localStorage.
 *
 *  1. JSON.parse với reviver strip dangerous keys.
 *  2. Reject nếu nested depth vượt MAX_NESTED_DEPTH.
 *  3. Whitelist top-level keys (drop extras).
 *  4. `elements` phải là array, mỗi item là object có `id: string` + `type: string`.
 *
 * Trả về `null` nếu bất kỳ check nào fail (caller handle như "no data").
 */
export function safeParseScene(raw: string): ParsedScene | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw, sanitizingReviver);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  if (depthExceeds(parsed, MAX_NESTED_DEPTH)) return null;

  // Whitelist top-level keys.
  const safe: Record<string, unknown> = {};
  for (const k of Object.keys(parsed)) {
    if (ALLOWED_TOP_LEVEL_KEYS.has(k)) safe[k] = parsed[k];
  }

  if (!Array.isArray(safe.elements)) return null;
  for (const el of safe.elements as unknown[]) {
    if (!isPlainObject(el)) return null;
    if (typeof el.id !== 'string' || typeof el.type !== 'string') return null;
  }

  const appState = isPlainObject(safe.appState) ? safe.appState : {};

  return {
    version: safe.version,
    elements: safe.elements as unknown[],
    appState,
    savedAt: safe.savedAt,
  };
}
