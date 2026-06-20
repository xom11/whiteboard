// src/stamps/geometry-2d/ai/rules/__tests__/escapeRe.test.ts
//
// Bug-class lặp lại (CLAUDE.md): tên tâm/đường tròn méo OCR ("(O", "O*") nội suy
// vào new RegExp() → "Unterminated group" crash CẢ pipeline. escapeRe là 1 nguồn
// duy nhất (gom 2 def trùng + 3 inline .replace) để mọi `new RegExp(`${name}`)`
// dùng chung — biến quy tắc "MỌI name-interpolation phải escape" thành cơ học.
import { escapeRe } from '../_shared';

describe('escapeRe (gom 1 nguồn — _shared)', () => {
  it('tên méo OCR "(O" → RegExp hợp lệ, khớp literal (không crash hsg9:306)', () => {
    const name = '(O';
    expect(() => new RegExp(escapeRe(name))).not.toThrow();
    expect(new RegExp(escapeRe(name)).test('x(Oy')).toBe(true);
    expect(new RegExp(escapeRe(name)).test('xOy')).toBe(false);
  });

  it('tên "O*" (OCR) → escape dấu * thay vì coi là quantifier', () => {
    expect(() => new RegExp(escapeRe('O*'))).not.toThrow();
    expect(escapeRe('O*')).toBe('O\\*');
  });

  it('identity trên tên thường (HOA + prime + chỉ số)', () => {
    expect(escapeRe('O')).toBe('O');
    expect(escapeRe("O'")).toBe("O'"); // prime không phải regex-meta
    expect(escapeRe('O1')).toBe('O1');
  });

  it('escape mọi metacharacter JS regex', () => {
    expect(escapeRe('a.b+c?^$|()[]{}\\')).toBe('a\\.b\\+c\\?\\^\\$\\|\\(\\)\\[\\]\\{\\}\\\\');
  });
});
