// src/stamps/graph-2d/fromExpression.ts
//
// Nhận dạng "GV vừa gõ một hàm số" + dựng dữ liệu gieo sẵn cho editor đồ thị.
// Dùng ở editor Dựng hình học (geometry-2d): gõ `y = x^2 - 2x` vào ô tìm công
// cụ → gợi ý "Chuyển sang đồ thị 2D" → mở graph-2d với hàm đã điền.
//
// Pure (không React/JSXGraph). Parser của function2d chỉ nhận cú pháp kiểu JS
// (`2*x`, `x**2` qua `^`), trong khi GV gõ theo thói quen viết tay (`2x`,
// `(x-1)(x+2)`, `mx+1`, `sinx`, `x²`) → phải chuẩn hoá TRƯỚC khi validate.

import { createStore, createEmptyState } from '../../core/scene';
import {
  ALLOWED_CONSTANTS,
  ALLOWED_FUNCTIONS,
  collectFreeVars,
  validate,
} from '../../core/scene/expressions/parser';
import { stringifySceneState } from './serialize';
import type { Graph2DCustomData } from './types';

export interface ParsedFunctionInput {
  /** Biểu thức đã chuẩn hoá, dùng thẳng làm `function2d.attrs.expression`. */
  expression: string;
  /** Tham số tự do (1 chữ cái) — gieo sẵn thành thanh trượt. */
  params: string[];
}

// Dài trước: alternation thử theo thứ tự, "log" đứng trước "log10" thì
// `log10x` thành log(10x) thay vì log10(x).
const FN_ALT = [...ALLOWED_FUNCTIONS].sort((a, b) => b.length - a.length).join('|');
const KNOWN_IDS = new Set<string>([...ALLOWED_FUNCTIONS, ...ALLOWED_CONSTANTS, 'x']);

/**
 * Tiền tố khai báo hàm: `y =`, `f(x) =`, `g(x)=`… Có tiền tố thì chấp nhận cả
 * hàm hằng (`y = 3`); không có thì bắt buộc phải có biến x.
 */
const PREFIX_RE = /^(?:y|[a-z]\s*\(\s*x\s*\))\s*=\s*/i;

/** Ký tự viết tay / bàn phím toán → cú pháp parser. */
function normalizeSymbols(s: string): string {
  return s
    .replace(/[−–—]/g, '-')
    .replace(/[×·⋅∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    // √(…) → sqrt(…); √x / √2 → sqrt(x) / sqrt(2)
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([A-Za-z]|\d+(?:\.\d+)?)/g, 'sqrt($1)');
}

/** Chèn phép nhân ngầm định mà người viết tay bỏ qua. */
function insertImplicitMultiplication(s: string): string {
  let out = s;
  // sinx → sin(x); sin2x → sin(2x) (hàm đứng liền biến/số, không có ngoặc).
  out = out.replace(
    new RegExp(`\\b(${FN_ALT})(\\d*\\.?\\d*x|\\d+(?:\\.\\d+)?)(?![A-Za-z0-9(])`, 'g'),
    '$1($2)',
  );
  // mx, ax, kx → m*x … CHỈ đúng dạng "1 chữ cái + x", không tách từ dài hơn:
  // tách tuỳ tiện thì "text" thành t*e*x (e là hằng) → nhận nhầm là hàm.
  out = out.replace(/\b([a-wz])x\b/g, (m, p: string) => (KNOWN_IDS.has(m) ? m : `${p}*x`));
  // x(…) → x*(…). Lookbehind thay vì \b: `3x(x-1)` không có ranh giới từ giữa
  // 3 và x; chỉ loại x đứng sau CHỮ CÁI (max(, exp( giữ nguyên).
  out = out.replace(/(?<![A-Za-z_])x\s*\(/g, 'x*(');
  // πx, π(…) → pi*x, pi*(…) (π đã thành "pi" ở normalizeSymbols, dính sang x
  // thành "pix" là tham số nhiều chữ ⇒ bị từ chối).
  out = out.replace(/(?<![A-Za-z_])pi(?=[A-Za-z0-9(])/g, 'pi*');
  // Số ĐỨNG RIÊNG liền chữ / mở ngoặc: 2x, 2(…), 2pi, 3sin(x) → 2*x, 2*(…)…
  // Lookbehind loại chữ số NẰM TRONG tên (log10, atan2): bản đầu thiếu nó nên
  // `log10(x)` thành `log10*(x)`.
  out = out.replace(/(?<![A-Za-z_\d.])(\d+(?:\.\d+)?)(?=[A-Za-z(])/g, '$1*');
  // Đóng ngoặc liền số / chữ / mở ngoặc: (x-1)(x+2), (x+1)x, (x+1)2
  out = out.replace(/\)\s*(?=[A-Za-z0-9(])/g, ')*');
  return out;
}

/**
 * Đọc chuỗi GV gõ; trả về hàm đã chuẩn hoá nếu nó đúng là một hàm y = f(x),
 * ngược lại `null` (chuỗi tìm công cụ bình thường, biểu thức lỗi, phương trình
 * không phải dạng hàm…).
 */
export function parseFunctionInput(input: string): ParsedFunctionInput | null {
  let s = normalizeSymbols(input.trim());
  if (!s) return null;

  const prefix = PREFIX_RE.exec(s);
  const hasPrefix = prefix !== null;
  if (prefix) s = s.slice(prefix[0].length);
  // Còn dấu "=" sau khi bỏ tiền tố ⇒ phương trình (x + y = 1), không phải hàm.
  if (s.includes('=') || !s.trim()) return null;

  // Bỏ khoảng trắng TRƯỚC khi chèn phép nhân: `sin x`, `m x`, `2 x` phải được
  // đối xử như `sinx`, `mx`, `2x`.
  s = insertImplicitMultiplication(s.replace(/\s+/g, ''));
  if (!validate(s).ok) return null;

  const ids = new Set(s.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []);
  if (!ids.has('x') && !hasPrefix) return null;

  // Tham số hợp lệ = MỘT chữ cái, khác y. Từ dài hơn (vd "diem", "abc") là
  // chữ tìm công cụ chứ không phải công thức; y lẫn trong vế phải ⇒ không phải
  // dạng y = f(x).
  const params = collectFreeVars(s);
  if (params.some((p) => p.length !== 1 || p === 'y')) return null;

  return { expression: s, params: [...params].sort() };
}

/** Màu mặc định của hàm đầu tiên — khớp nút "+ Hàm" trong graph-2d host. */
const FIRST_FUNCTION_COLOR = '#2563eb';

/**
 * Dựng customData graph2d có sẵn một hàm (và thanh trượt cho từng tham số).
 * Đi qua store + reducer thật (ADD → kindDef.validate) thay vì tự ghép JSON,
 * để dữ liệu gieo luôn hợp lệ với chính editor sẽ mở nó.
 */
export function buildGraph2DSeed(parsed: ParsedFunctionInput): Graph2DCustomData {
  const store = createStore(createEmptyState('graph2d'));
  for (const p of parsed.params) {
    store.dispatch({
      type: 'ADD',
      payload: {
        obj: {
          id: p,
          kind: 'parameter',
          label: p,
          visible: true,
          locked: false,
          layer: 'default',
          schemaVersion: 1,
          attrs: { value: 1, min: -5, max: 5, step: 0.1 },
        },
      },
    });
  }
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id: 'f1',
        kind: 'function2d',
        label: 'f1',
        visible: true,
        locked: false,
        layer: 'default',
        schemaVersion: 1,
        attrs: { expression: parsed.expression, color: FIRST_FUNCTION_COLOR, visible: true },
      },
    },
  });
  return { kind: 'graph2d', version: 2, jsonState: stringifySceneState(store.getState()) };
}
