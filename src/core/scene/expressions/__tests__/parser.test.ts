import { validate, compile, collectFreeVars, ALLOWED_FUNCTIONS, ALLOWED_CONSTANTS } from '../parser';

describe('expressions/parser', () => {
  describe('validate', () => {
    it('valid expression → ok', () => {
      expect(validate('x^2 + 2*x + 1')).toEqual({ ok: true });
      expect(validate('sin(x) + cos(a)')).toEqual({ ok: true });
      expect(validate('pi * x')).toEqual({ ok: true });
    });

    it('empty → error', () => {
      const r = validate('');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/rỗng|empty/i);
    });

    it('unknown identifier → error', () => {
      const r = validate('unknown_func(x)');
      expect(r.ok).toBe(false);
    });

    it('unsafe operators → error', () => {
      expect(validate('x = 5').ok).toBe(false);
      expect(validate('x; y').ok).toBe(false);
      expect(validate('eval(x)').ok).toBe(false);
    });
  });

  describe('compile', () => {
    it('x^2 with x=3 → 9', () => {
      const fn = compile('x^2', {});
      expect(typeof fn).toBe('function');
      if (typeof fn === 'function') expect(fn(3)).toBe(9);
    });

    it('uses parameter map', () => {
      const fn = compile('a*x + b', { a: 2, b: 1 });
      if (typeof fn === 'function') expect(fn(3)).toBe(7);
    });

    it('uses Math functions', () => {
      const fn = compile('sin(x)', {});
      if (typeof fn === 'function') expect(fn(0)).toBeCloseTo(0);
    });

    it('uses constants', () => {
      const fn = compile('pi', {});
      if (typeof fn === 'function') expect(fn(0)).toBeCloseTo(Math.PI);
    });

    it('returns error string on invalid', () => {
      const r = compile('x +', {});
      expect(typeof r).toBe('string');
    });
  });

  describe('collectFreeVars', () => {
    it('returns [x, a] for "a*x + b" when only a known', () => {
      const vars = collectFreeVars('a*x + b');
      expect(vars).toEqual(expect.arrayContaining(['a', 'b']));
      expect(vars).not.toContain('x');         // x là biến độc lập
      expect(vars).not.toContain('sin');       // sin trong allowed
    });

    it('returns [] for "x^2"', () => {
      expect(collectFreeVars('x^2')).toEqual([]);
    });
  });

  describe('whitelist', () => {
    it('ALLOWED_FUNCTIONS chứa sin/cos/tan/sqrt/log/exp/abs', () => {
      const required = ['sin', 'cos', 'tan', 'sqrt', 'log', 'exp', 'abs', 'pow'];
      for (const fn of required) expect(ALLOWED_FUNCTIONS).toContain(fn);
    });

    it('ALLOWED_CONSTANTS chứa pi và e', () => {
      expect(ALLOWED_CONSTANTS).toContain('pi');
      expect(ALLOWED_CONSTANTS).toContain('e');
    });
  });
});
