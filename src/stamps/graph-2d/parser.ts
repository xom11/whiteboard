const ALLOWED_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'log', 'ln', 'exp', 'sqrt', 'abs',
  'floor', 'ceil', 'round',
]);

const ALLOWED_CHARS = /^[a-zA-Z0-9_.+\-*/^()\s,]+$/;
const IDENTIFIER_RE = /[a-zA-Z][a-zA-Z0-9_]*/g;

const SUGGESTIONS: Record<string, string> = {
  tg: 'tan',
  arcsin: 'asin',
  arccos: 'acos',
  arctan: 'atan',
};

export interface ParseResult {
  ok: boolean;
  error?: string;
  freeVars: Set<string>;
}

function errResult(message: string): ParseResult {
  return { ok: false, error: message, freeVars: new Set() };
}

export function validate(expr: string): ParseResult {
  const trimmed = expr.trim();
  if (!trimmed) return errResult('Biểu thức rỗng');
  if (!ALLOWED_CHARS.test(trimmed)) return errResult('Ký tự không hợp lệ');

  const ids = trimmed.match(IDENTIFIER_RE) ?? [];
  const freeVars = new Set<string>();
  for (const id of ids) {
    if (id === 'x' || id === 'pi' || id === 'e') continue;
    if (ALLOWED_FUNCTIONS.has(id)) continue;
    if (id.length === 1) {
      freeVars.add(id);
      continue;
    }
    const hint = SUGGESTIONS[id];
    return errResult(
      hint
        ? `Tên hàm không hợp lệ: "${id}". Bạn có ý là "${hint}" không?`
        : `Tên không hợp lệ: "${id}"`,
    );
  }

  try {
    const paramSubs = Object.fromEntries([...freeVars].map((v) => [v, 1]));
    const rewritten = rewriteToJs(trimmed, paramSubs);
    new Function('x', `return (${rewritten})`);
  } catch {
    return errResult('Lỗi cú pháp');
  }

  return { ok: true, freeVars };
}

const FUNCTION_REPLACEMENTS: Array<[string, string]> = [
  // longest first để tránh substring conflict (asin trước sin)
  ['asin', 'Math.asin'],
  ['acos', 'Math.acos'],
  ['atan', 'Math.atan'],
  ['sqrt', 'Math.sqrt'],
  ['floor', 'Math.floor'],
  ['round', 'Math.round'],
  ['ceil', 'Math.ceil'],
  ['sin', 'Math.sin'],
  ['cos', 'Math.cos'],
  ['tan', 'Math.tan'],
  ['abs', 'Math.abs'],
  ['exp', 'Math.exp'],
  ['log', 'Math.log10'],
  ['ln', 'Math.log'],
];

export function rewriteToJs(
  expr: string,
  params: Record<string, number>,
): string {
  let s = expr.replace(/\^/g, '**');
  s = s.replace(/\bpi\b/g, 'Math.PI');
  s = s.replace(/\be\b/g, 'Math.E');
  for (const [from, to] of FUNCTION_REPLACEMENTS) {
    s = s.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
  }
  for (const [name, value] of Object.entries(params)) {
    if (name.length !== 1) continue;
    s = s.replace(new RegExp(`\\b${name}\\b`, 'g'), `(${value})`);
  }
  return s;
}

export function compile(
  expr: string,
  paramValues: Record<string, number>,
): ((x: number) => number) | { error: string } {
  const v = validate(expr);
  if (!v.ok) return { error: v.error ?? 'Invalid' };
  try {
    const rewritten = rewriteToJs(expr, paramValues);
    const raw = new Function('x', `return (${rewritten})`) as (x: number) => number;
    return (x: number) => {
      try {
        const y = raw(x);
        return typeof y === 'number' ? y : NaN;
      } catch {
        return NaN;
      }
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
