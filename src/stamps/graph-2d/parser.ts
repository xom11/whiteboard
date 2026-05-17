import {
  ALLOWED_FUNCTION_NAMES,
  checkIdentifiers,
  collectFreeVars,
  evaluate,
  parseAst,
  tokenize,
  type AstNode,
} from './evaluator';

const ALLOWED_FUNCTIONS = ALLOWED_FUNCTION_NAMES;

// Giữ whitelist ký tự để fail-closed sớm — không cho ; = [ ] ' " ` { } \ v.v.
const ALLOWED_CHARS = /^[a-zA-Z0-9_.+\-*/^()\s,]+$/;

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

  // Tokenize trước để lấy danh sách IDENT thật sự (loại bỏ exponent `e` của số như `1e3`).
  // Pre-check identifier để cho ra error message thân thiện (suggestion tg→tan, ...).
  let tokens;
  try {
    tokens = tokenize(trimmed);
  } catch {
    return errResult('Lỗi cú pháp');
  }
  const earlyFree = new Set<string>();
  for (const tok of tokens) {
    if (tok.type !== 'IDENT') continue;
    const id = tok.value;
    if (id === 'x' || id === 'pi' || id === 'e') continue;
    if (ALLOWED_FUNCTIONS.has(id)) continue;
    if (id.length === 1) {
      earlyFree.add(id);
      continue;
    }
    const hint = SUGGESTIONS[id];
    return errResult(
      hint
        ? `Tên hàm không hợp lệ: "${id}". Bạn có ý là "${hint}" không?`
        : `Tên không hợp lệ: "${id}"`,
    );
  }

  let ast: AstNode;
  try {
    ast = parseAst(trimmed);
  } catch {
    return errResult('Lỗi cú pháp');
  }

  const idErr = checkIdentifiers(ast);
  if (idErr) return errResult(idErr);

  const freeVars = collectFreeVars(ast);
  // Hợp nhất với earlyFree (regex pass) — thường giống nhau, nhưng đảm bảo invariant.
  for (const v of earlyFree) freeVars.add(v);
  return { ok: true, freeVars };
}

// FUNCTION_REPLACEMENTS giữ longest-first để rewriteToJs không nhầm asin→a-sin.
const FUNCTION_REPLACEMENTS: Array<[string, string]> = [
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

/**
 * Chuyển expression user-input sang JS string tương đương.
 *
 * Function này chỉ dùng cho debug / hiển thị / tương thích ngược.
 * Runtime KHÔNG còn `eval` chuỗi này — `compile()` dùng AST evaluator.
 */
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
  let ast: AstNode;
  try {
    ast = parseAst(expr.trim());
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  return (x: number) => {
    try {
      const y = evaluate(ast, { x, params: paramValues });
      return typeof y === 'number' ? y : NaN;
    } catch {
      return NaN;
    }
  };
}
