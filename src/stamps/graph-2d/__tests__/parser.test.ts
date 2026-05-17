import { validate, rewriteToJs, compile } from '../parser';

describe('parser.validate', () => {
  it('chấp nhận biểu thức cơ bản', () => {
    expect(validate('x').ok).toBe(true);
    expect(validate('x^2').ok).toBe(true);
    expect(validate('x^2 + 2*x - 3').ok).toBe(true);
    expect(validate('sin(x)').ok).toBe(true);
    expect(validate('log(x) + sqrt(x)').ok).toBe(true);
    expect(validate('pi * x').ok).toBe(true);
    expect(validate('e^x').ok).toBe(true);
  });

  it('reject biểu thức rỗng', () => {
    const r = validate('');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/rỗng/i);
  });

  it('reject ký tự không hợp lệ', () => {
    expect(validate('x = 1').ok).toBe(false);
    expect(validate('x; y').ok).toBe(false);
    expect(validate('x[0]').ok).toBe(false);
    expect(validate("x + '1'").ok).toBe(false);
  });

  it('reject tên hàm lạ', () => {
    const r = validate('tg(x)');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/tan/);
  });

  it('reject identifier dài > 1 không phải hàm whitelist', () => {
    const r = validate('foo(x)');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/foo/);
  });

  it('detect free variables (tham số 1 ký tự)', () => {
    expect([...validate('a*x + b').freeVars].sort()).toEqual(['a', 'b']);
    expect([...validate('m * sin(x)').freeVars]).toEqual(['m']);
    expect([...validate('x^2').freeVars]).toEqual([]);
  });

  it('reject grammar lỗi', () => {
    expect(validate('x +').ok).toBe(false);
    expect(validate('(x').ok).toBe(false);
    expect(validate(')').ok).toBe(false);
  });
});

describe('parser.rewriteToJs', () => {
  it('chuyển ^ thành **', () => {
    expect(rewriteToJs('x^2', {})).toBe('x**2');
  });

  it('thay thế hằng pi và e', () => {
    expect(rewriteToJs('pi * x', {})).toBe('Math.PI * x');
    expect(rewriteToJs('e^x', {})).toBe('Math.E**x');
  });

  it('thay thế hàm whitelist với Math.<fn>', () => {
    expect(rewriteToJs('sin(x)', {})).toBe('Math.sin(x)');
    expect(rewriteToJs('cos(x)', {})).toBe('Math.cos(x)');
    expect(rewriteToJs('sqrt(x)', {})).toBe('Math.sqrt(x)');
  });

  it('không nhầm asin thành sin (longest first)', () => {
    expect(rewriteToJs('asin(x)', {})).toBe('Math.asin(x)');
    expect(rewriteToJs('acos(x)', {})).toBe('Math.acos(x)');
    expect(rewriteToJs('atan(x)', {})).toBe('Math.atan(x)');
  });

  it('log map sang Math.log10, ln map sang Math.log', () => {
    expect(rewriteToJs('log(x)', {})).toBe('Math.log10(x)');
    expect(rewriteToJs('ln(x)', {})).toBe('Math.log(x)');
  });

  it('thay thế tham số đơn ký tự', () => {
    expect(rewriteToJs('a*x + b', { a: 2, b: 3 })).toBe('(2)*x + (3)');
    expect(rewriteToJs('m * sin(x)', { m: 1.5 })).toBe('(1.5) * Math.sin(x)');
  });

  it('không thay thế tham số tên dài (chỉ 1 ký tự)', () => {
    expect(rewriteToJs('x', { foo: 99 })).toBe('x');
  });
});

describe('parser.compile', () => {
  it('compile expression cơ bản', () => {
    const fn = compile('x^2', {});
    expect(typeof fn).toBe('function');
    expect((fn as (x: number) => number)(3)).toBe(9);
  });

  it('substitute parameters', () => {
    const fn = compile('a*x + b', { a: 2, b: 5 });
    expect((fn as (x: number) => number)(3)).toBe(11);
  });

  it('hàm số học', () => {
    const fn = compile('sin(x)', {}) as (x: number) => number;
    expect(fn(0)).toBeCloseTo(0);
    expect(fn(Math.PI / 2)).toBeCloseTo(1);
  });

  it('hằng pi và e', () => {
    expect((compile('pi', {}) as (x: number) => number)(0)).toBeCloseTo(Math.PI);
    expect((compile('e', {}) as (x: number) => number)(0)).toBeCloseTo(Math.E);
  });

  it('trả NaN khi runtime ném exception', () => {
    const fn = compile('sqrt(x)', {}) as (x: number) => number;
    expect(fn(4)).toBeCloseTo(2);
    expect(Number.isNaN(fn(-1))).toBe(true);
  });

  it('reject expression invalid trả { error }', () => {
    const r = compile('foo(x)', {});
    expect(typeof r).toBe('object');
    expect((r as { error: string }).error).toBeTruthy();
  });

  it('log = log10, ln = log tự nhiên', () => {
    const lg = compile('log(x)', {}) as (x: number) => number;
    const ln = compile('ln(x)', {}) as (x: number) => number;
    expect(lg(100)).toBeCloseTo(2);
    expect(ln(Math.E)).toBeCloseTo(1);
  });
});

describe('parser security — reject payload tấn công', () => {
  // Mọi payload sau đây phải bị reject ở tầng validate(),
  // KHÔNG bao giờ được phép chạy thành function gì cả.
  const MALICIOUS = [
    'constructor',
    'prototype',
    '__proto__',
    'Function',
    'globalThis',
    'this',
    'window',
    'self',
    'process',
    'require',
    'eval',
    'constructor("alert(1)")',
    'x.constructor',
    'x["constructor"]',
    'x.__proto__',
    '(0,eval)("1+1")',
    'Function("return 1")()',
    'globalThis.alert(1)',
  ];

  for (const src of MALICIOUS) {
    it(`reject: ${src}`, () => {
      const r = validate(src);
      expect(r.ok).toBe(false);
      const c = compile(src, {});
      expect(typeof c).toBe('object');
      expect((c as { error: string }).error).toBeTruthy();
    });
  }

  it('reject ký tự lạ: ; = [ ] " \' ` \\ { }', () => {
    expect(validate('x; y').ok).toBe(false);
    expect(validate('x = 1').ok).toBe(false);
    expect(validate('x[0]').ok).toBe(false);
    expect(validate('x]').ok).toBe(false);
    expect(validate('x"').ok).toBe(false);
    expect(validate("x'").ok).toBe(false);
    expect(validate('x`y`').ok).toBe(false);
    expect(validate('x\\y').ok).toBe(false);
    expect(validate('{x}').ok).toBe(false);
    expect(validate('}').ok).toBe(false);
  });

  it('reject arrow function-ish payload', () => {
    expect(validate('x => x').ok).toBe(false);
    expect(validate('()=>1').ok).toBe(false);
  });
});

describe('parser AST evaluator — extended', () => {
  it('scientific notation', () => {
    const fn = compile('1e3 * x', {}) as (x: number) => number;
    expect(fn(2)).toBeCloseTo(2000);
    const fn2 = compile('1.5e-2', {}) as (x: number) => number;
    expect(fn2(0)).toBeCloseTo(0.015);
  });

  it('unary minus', () => {
    const fn = compile('-x', {}) as (x: number) => number;
    expect(fn(3)).toBe(-3);
    const fn2 = compile('-(-x)', {}) as (x: number) => number;
    expect(fn2(3)).toBe(3);
  });

  it('precedence: 2 + 3 * 4 = 14', () => {
    const fn = compile('2 + 3 * 4', {}) as (x: number) => number;
    expect(fn(0)).toBe(14);
  });

  it('^ right-associative: 2^3^2 = 512', () => {
    const fn = compile('2^3^2', {}) as (x: number) => number;
    expect(fn(0)).toBe(512);
  });

  it('^ với unary minus mũ: 2^-x', () => {
    const fn = compile('2^-x', {}) as (x: number) => number;
    expect(fn(2)).toBeCloseTo(0.25);
  });

  it('division by zero → Infinity (không throw)', () => {
    const fn = compile('1/x', {}) as (x: number) => number;
    expect(fn(0)).toBe(Infinity);
    expect(fn(-0)).toBe(-Infinity);
  });

  it('floor / ceil / round', () => {
    expect((compile('floor(x)', {}) as (x: number) => number)(1.9)).toBe(1);
    expect((compile('ceil(x)', {}) as (x: number) => number)(1.1)).toBe(2);
    expect((compile('round(x)', {}) as (x: number) => number)(1.5)).toBe(2);
  });

  it('abs', () => {
    expect((compile('abs(x)', {}) as (x: number) => number)(-7)).toBe(7);
  });

  it('exp + ln roundtrip', () => {
    const fn = compile('ln(exp(x))', {}) as (x: number) => number;
    expect(fn(3)).toBeCloseTo(3);
  });

  it('không cho phép identifier tên hằng dùng như hàm: pi(x), e(x)', () => {
    // pi và e không phải hàm — phải bị reject vì syntax cố gọi như hàm
    // Validate phải fail vì AST sẽ thấy `call { name: "pi" }` mà pi không trong ALLOWED_FUNCTIONS
    const r1 = validate('pi(x)');
    expect(r1.ok).toBe(false);
  });

  it('reject identifier nhiều ký tự không whitelist', () => {
    const r = validate('foo');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/foo/);
  });

  it('parser KHÔNG còn `new Function` — kiểm tra source', () => {
    // Đọc parser.ts thành string và đảm bảo không còn `new Function` hay `eval(`
    // (smoke test cho acceptance criteria của issue #3)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const parserSrc = fs.readFileSync(
      path.resolve(__dirname, '..', 'parser.ts'),
      'utf8',
    );
    const evalSrc = fs.readFileSync(
      path.resolve(__dirname, '..', 'evaluator.ts'),
      'utf8',
    );
    expect(parserSrc).not.toMatch(/new\s+Function\s*\(/);
    expect(parserSrc).not.toMatch(/\beval\s*\(/);
    expect(evalSrc).not.toMatch(/new\s+Function\s*\(/);
    expect(evalSrc).not.toMatch(/\beval\s*\(/);
  });
});
