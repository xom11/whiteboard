/**
 * AST-based math expression evaluator — an toàn hơn `new Function`.
 *
 * Hỗ trợ:
 *   - Toán tử: + - * / ^ và unary minus, dấu ngoặc ( )
 *   - Số: integer, float, scientific notation (1e3, 1.2e-4)
 *   - Hằng: pi → Math.PI, e → Math.E
 *   - Biến: x (mặc định) + tham số đơn ký tự (a..z trừ x, e)
 *   - Hàm: sin cos tan asin acos atan log ln exp sqrt abs floor ceil round
 *
 * KHÔNG dùng `new Function`, `eval`, `Function()`, hay bất kỳ dynamic code-gen nào.
 */

const ALLOWED_FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  log: Math.log10, // log = log10 (khớp với rewriteToJs)
  ln: Math.log, // ln = log tự nhiên
  exp: Math.exp,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
} as const;

const ALLOWED_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

// ----- Tokenizer ----------------------------------------------------------

type TokenType = 'NUMBER' | 'IDENT' | 'OP' | 'LPAREN' | 'RPAREN' | 'COMMA';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const OPERATORS = new Set(['+', '-', '*', '/', '^']);

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];

    // whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // number (int, float, scientific)
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let j = i;
      let hasDot = false;
      let hasExp = false;
      while (j < src.length) {
        const c = src[j];
        if (c >= '0' && c <= '9') {
          j++;
        } else if (c === '.' && !hasDot && !hasExp) {
          hasDot = true;
          j++;
        } else if ((c === 'e' || c === 'E') && !hasExp) {
          hasExp = true;
          j++;
          if (src[j] === '+' || src[j] === '-') j++;
        } else {
          break;
        }
      }
      const raw = src.slice(i, j);
      // raw must contain ít nhất 1 digit
      if (!/[0-9]/.test(raw)) {
        throw new Error(`Số không hợp lệ tại vị trí ${i}: "${raw}"`);
      }
      tokens.push({ type: 'NUMBER', value: raw, pos: i });
      i = j;
      continue;
    }

    // identifier (a-zA-Z, sau đó a-zA-Z0-9_)
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
      let j = i;
      while (j < src.length) {
        const c = src[j];
        if (
          (c >= 'a' && c <= 'z') ||
          (c >= 'A' && c <= 'Z') ||
          (c >= '0' && c <= '9') ||
          c === '_'
        ) {
          j++;
        } else {
          break;
        }
      }
      tokens.push({ type: 'IDENT', value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }

    if (OPERATORS.has(ch)) {
      tokens.push({ type: 'OP', value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ch, pos: i });
      i++;
      continue;
    }

    throw new Error(`Ký tự không hợp lệ tại vị trí ${i}: "${ch}"`);
  }
  return tokens;
}

// ----- AST ----------------------------------------------------------------

export type AstNode =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'unary'; op: '-' | '+'; arg: AstNode }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^'; lhs: AstNode; rhs: AstNode }
  | { kind: 'call'; name: string; args: AstNode[] };

// ----- Parser (Pratt-style precedence climbing) ---------------------------

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const t = this.tokens[this.pos++];
    if (!t) throw new Error('Cú pháp: hết token sớm');
    return t;
  }

  parseExpression(): AstNode {
    const node = this.parseAddSub();
    if (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      throw new Error(`Cú pháp: token thừa "${t.value}" tại vị trí ${t.pos}`);
    }
    return node;
  }

  // + - (left assoc)
  private parseAddSub(): AstNode {
    let lhs = this.parseMulDiv();
    while (true) {
      const t = this.peek();
      if (t && t.type === 'OP' && (t.value === '+' || t.value === '-')) {
        this.consume();
        const rhs = this.parseMulDiv();
        lhs = { kind: 'binary', op: t.value as '+' | '-', lhs, rhs };
      } else {
        break;
      }
    }
    return lhs;
  }

  // * / (left assoc)
  private parseMulDiv(): AstNode {
    let lhs = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (t && t.type === 'OP' && (t.value === '*' || t.value === '/')) {
        this.consume();
        const rhs = this.parseUnary();
        lhs = { kind: 'binary', op: t.value as '*' | '/', lhs, rhs };
      } else {
        break;
      }
    }
    return lhs;
  }

  // unary + - (right assoc) sau đó parsePow
  private parseUnary(): AstNode {
    const t = this.peek();
    if (t && t.type === 'OP' && (t.value === '+' || t.value === '-')) {
      this.consume();
      const arg = this.parseUnary();
      return { kind: 'unary', op: t.value as '+' | '-', arg };
    }
    return this.parsePow();
  }

  // ^ (right assoc)
  private parsePow(): AstNode {
    const lhs = this.parsePrimary();
    const t = this.peek();
    if (t && t.type === 'OP' && t.value === '^') {
      this.consume();
      // right-assoc: parseUnary để chấp nhận `2^-x`
      const rhs = this.parseUnary();
      return { kind: 'binary', op: '^', lhs, rhs };
    }
    return lhs;
  }

  private parsePrimary(): AstNode {
    const t = this.peek();
    if (!t) throw new Error('Cú pháp: thiếu biểu thức');

    if (t.type === 'NUMBER') {
      this.consume();
      const v = Number(t.value);
      if (!Number.isFinite(v) && !Number.isNaN(v)) {
        // Vẫn cho phép Infinity literal hiếm khi xảy ra; nhưng safe-guard NaN
      }
      return { kind: 'num', value: v };
    }

    if (t.type === 'IDENT') {
      this.consume();
      const next = this.peek();
      if (next && next.type === 'LPAREN') {
        // Function call
        this.consume(); // (
        const args: AstNode[] = [];
        const lookahead = this.peek();
        if (!lookahead || lookahead.type !== 'RPAREN') {
          args.push(this.parseAddSub());
          while (true) {
            const nx = this.peek();
            if (nx && nx.type === 'COMMA') {
              this.consume();
              args.push(this.parseAddSub());
            } else {
              break;
            }
          }
        }
        const close = this.peek();
        if (!close || close.type !== 'RPAREN') {
          throw new Error(`Cú pháp: thiếu ")" sau hàm "${t.value}"`);
        }
        this.consume(); // )
        return { kind: 'call', name: t.value, args };
      }
      return { kind: 'ident', name: t.value };
    }

    if (t.type === 'LPAREN') {
      this.consume();
      const inner = this.parseAddSub();
      const close = this.peek();
      if (!close || close.type !== 'RPAREN') {
        throw new Error('Cú pháp: thiếu ")"');
      }
      this.consume();
      return inner;
    }

    throw new Error(`Cú pháp: token bất ngờ "${t.value}" tại vị trí ${t.pos}`);
  }
}

export function parseAst(src: string): AstNode {
  const tokens = tokenize(src);
  if (tokens.length === 0) throw new Error('Biểu thức rỗng');
  const p = new Parser(tokens);
  return p.parseExpression();
}

// ----- Evaluator ----------------------------------------------------------

export interface EvalEnv {
  /** Giá trị của biến `x`. */
  x: number;
  /** Tham số đơn ký tự (a, b, c, ...) từ caller. */
  params: Record<string, number>;
}

export function evaluate(node: AstNode, env: EvalEnv): number {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'ident': {
      const name = node.name;
      if (name === 'x') return env.x;
      if (Object.prototype.hasOwnProperty.call(ALLOWED_CONSTANTS, name)) {
        return ALLOWED_CONSTANTS[name];
      }
      // tham số 1 ký tự
      if (name.length === 1 && Object.prototype.hasOwnProperty.call(env.params, name)) {
        return env.params[name];
      }
      throw new Error(`Identifier không hợp lệ: "${name}"`);
    }
    case 'unary': {
      const v = evaluate(node.arg, env);
      return node.op === '-' ? -v : +v;
    }
    case 'binary': {
      const a = evaluate(node.lhs, env);
      const b = evaluate(node.rhs, env);
      switch (node.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return a / b; // có thể trả Infinity/NaN — đúng theo IEEE 754
        case '^':
          return Math.pow(a, b);
      }
      // exhaustive — TS không bắt được vì op đã typed
      throw new Error(`Toán tử không hỗ trợ: "${(node as { op: string }).op}"`);
    }
    case 'call': {
      const fn = (ALLOWED_FUNCTIONS as Record<string, (...args: number[]) => number>)[node.name];
      if (typeof fn !== 'function') {
        throw new Error(`Hàm không hợp lệ: "${node.name}"`);
      }
      const args = node.args.map((a) => evaluate(a, env));
      return fn(...args);
    }
  }
}

/**
 * Lấy danh sách identifier đơn ký tự (ngoài `x`, `pi`, `e`) — đây là các tham số tự do.
 * Không tính identifier xuất hiện dưới dạng tên hàm (vd `sin` trong `sin(x)`).
 */
export function collectFreeVars(node: AstNode, out: Set<string> = new Set()): Set<string> {
  switch (node.kind) {
    case 'num':
      return out;
    case 'ident': {
      const name = node.name;
      if (name === 'x') return out;
      if (Object.prototype.hasOwnProperty.call(ALLOWED_CONSTANTS, name)) return out;
      if (name.length === 1) out.add(name);
      // identifier dài > 1 không phải hằng → caller validate sẽ catch
      return out;
    }
    case 'unary':
      return collectFreeVars(node.arg, out);
    case 'binary':
      collectFreeVars(node.lhs, out);
      collectFreeVars(node.rhs, out);
      return out;
    case 'call':
      for (const a of node.args) collectFreeVars(a, out);
      return out;
  }
}

/**
 * Kiểm tra mọi identifier xuất hiện đều thuộc whitelist (functions/constants/x/single-char-param).
 * Trả về null nếu OK, hoặc message lỗi.
 */
export function checkIdentifiers(node: AstNode): string | null {
  switch (node.kind) {
    case 'num':
      return null;
    case 'ident': {
      const name = node.name;
      if (name === 'x') return null;
      if (Object.prototype.hasOwnProperty.call(ALLOWED_CONSTANTS, name)) return null;
      if (name.length === 1) return null;
      return `Tên không hợp lệ: "${name}"`;
    }
    case 'unary':
      return checkIdentifiers(node.arg);
    case 'binary':
      return checkIdentifiers(node.lhs) ?? checkIdentifiers(node.rhs);
    case 'call': {
      if (!Object.prototype.hasOwnProperty.call(ALLOWED_FUNCTIONS, node.name)) {
        return `Tên hàm không hợp lệ: "${node.name}"`;
      }
      for (const a of node.args) {
        const e = checkIdentifiers(a);
        if (e) return e;
      }
      return null;
    }
  }
}

export const ALLOWED_FUNCTION_NAMES: ReadonlySet<string> = new Set(Object.keys(ALLOWED_FUNCTIONS));
export const ALLOWED_CONSTANT_NAMES: ReadonlySet<string> = new Set(Object.keys(ALLOWED_CONSTANTS));
