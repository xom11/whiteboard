import { validate, rewriteToJs } from '../parser';

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
