// src/core/scene/expressions/parser.ts
// Pure expression parser cho function2d kind. Không import JSXGraph/React.

export const ALLOWED_CONSTANTS = ['pi', 'e'] as const;
export const ALLOWED_FUNCTIONS = [
  'sin', 'cos', 'tan',
  'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh',
  'exp', 'log', 'log10', 'ln',
  'sqrt', 'cbrt', 'abs',
  'floor', 'ceil', 'round',
  'min', 'max', 'pow',
] as const;

const ID_RE = /[A-Za-z_][A-Za-z0-9_]*/g;
const UNSAFE_RE = /[=;{}]|\beval\b|\bnew\b|\breturn\b|\bthis\b|\bwindow\b|\bdocument\b|\bglobal\b|\bprocess\b/;

const NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

export type ValidateResult = { ok: true } | { ok: false; error: string };

// Detect identifiers used as function calls (followed by '(')
const FUNC_CALL_RE = /([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;

/** Kiểm tra expression có hợp lệ không. */
export function validate(expression: string): ValidateResult {
  const trimmed = expression.trim();
  if (!trimmed) return { ok: false, error: 'Biểu thức rỗng' };
  if (UNSAFE_RE.test(trimmed)) return { ok: false, error: 'Biểu thức chứa toán tử hoặc identifier không cho phép' };

  // Replace ^ với ** (JS không có ^)
  const jsExpr = trimmed.replace(/\^/g, '**');

  // Check function call identifiers — must be in ALLOWED_FUNCTIONS
  let fm: RegExpExecArray | null;
  FUNC_CALL_RE.lastIndex = 0;
  while ((fm = FUNC_CALL_RE.exec(jsExpr)) !== null) {
    const fnName = fm[1];
    if (!(ALLOWED_FUNCTIONS as readonly string[]).includes(fnName)) {
      return { ok: false, error: `Hàm không hợp lệ: ${fnName}` };
    }
  }

  // Check identifiers
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  ID_RE.lastIndex = 0;
  while ((m = ID_RE.exec(jsExpr)) !== null) ids.add(m[0]);

  for (const id of ids) {
    if (id === 'x') continue;
    if ((ALLOWED_CONSTANTS as readonly string[]).includes(id)) continue;
    if ((ALLOWED_FUNCTIONS as readonly string[]).includes(id)) continue;
    // Remaining identifiers treat as parameter — OK at validate time.
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) {
      return { ok: false, error: `Identifier không hợp lệ: ${id}` };
    }
  }

  // Try syntactic compile (with dummy params) to catch syntax errors.
  try {
    buildFunctionBody(jsExpr, Array.from(ids).filter(
      (id) => id !== 'x' && !(ALLOWED_CONSTANTS as readonly string[]).includes(id) && !(ALLOWED_FUNCTIONS as readonly string[]).includes(id),
    ));
  } catch (err) {
    return { ok: false, error: `Cú pháp lỗi: ${(err as Error).message}` };
  }

  return { ok: true };
}

/**
 * Compile expression thành function (x: number) => number.
 * - `params` map từ identifier → value để inline vào closure.
 * - Trả string error nếu invalid.
 */
export function compile(
  expression: string,
  params: Record<string, number>,
): ((x: number) => number) | string {
  const v = validate(expression);
  if (!v.ok) return v.error;
  const jsExpr = expression.trim().replace(/\^/g, '**');

  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  ID_RE.lastIndex = 0;
  while ((m = ID_RE.exec(jsExpr)) !== null) ids.add(m[0]);

  const paramNames: string[] = [];
  for (const id of ids) {
    if (id === 'x') continue;
    if ((ALLOWED_CONSTANTS as readonly string[]).includes(id)) continue;
    if ((ALLOWED_FUNCTIONS as readonly string[]).includes(id)) continue;
    paramNames.push(id);
  }

  try {
    const body = buildFunctionBody(jsExpr, paramNames);
     
    const fn = new Function('x', ...paramNames, body) as (
      x: number,
      ...args: number[]
    ) => number;
    const args = paramNames.map((name) => params[name] ?? NaN);
    return (x: number) => fn(x, ...args);
  } catch (err) {
    return `Compile error: ${(err as Error).message}`;
  }
}

function buildFunctionBody(jsExpr: string, _paramNames: string[]): string {
  // Inline Math constants and functions.
  // sin → Math.sin, pi → Math.PI, e → Math.E, ln → Math.log.
  let body = jsExpr;
  body = body.replace(/\bln\b/g, 'Math.log');
  body = body.replace(/\blog\b/g, 'Math.log10');
  body = body.replace(/\bpi\b/g, '(Math.PI)');
  body = body.replace(/\be\b(?!\w)/g, '(Math.E)');
  for (const fn of ALLOWED_FUNCTIONS) {
    if (fn === 'log' || fn === 'log10') continue;        // already handled
    body = body.replace(new RegExp(`\\b${fn}\\b`, 'g'), `Math.${fn}`);
  }
  return `"use strict"; return (${body});`;
}

/** Liệt kê free identifiers (≠ x, ≠ allowed const/func). */
export function collectFreeVars(expression: string): string[] {
  const v = validate(expression);
  if (!v.ok) return [];
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  ID_RE.lastIndex = 0;
  while ((m = ID_RE.exec(expression)) !== null) ids.add(m[0]);
  const out: string[] = [];
  for (const id of ids) {
    if (id === 'x') continue;
    if ((ALLOWED_CONSTANTS as readonly string[]).includes(id)) continue;
    if ((ALLOWED_FUNCTIONS as readonly string[]).includes(id)) continue;
    if (NUMBER_RE.test(id)) continue;
    out.push(id);
  }
  return out.sort();
}
