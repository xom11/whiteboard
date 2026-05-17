import { validate } from '../parser';

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
