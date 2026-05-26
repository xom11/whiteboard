// src/stamps/geometry-2d/editor/__tests__/idResolvers.test.ts
import { jxgFromSceneId, jxgIdToSceneId } from '../idResolvers';
import type { JxgRenderer } from '../../../../core/scene/render/JxgRenderer';

 
type JxgObj = any;

/**
 * Mock một renderer chỉ với `elements` map cần thiết cho hai resolver.
 * Tests document hành vi quan trọng: aux objects (vd auxiliary points của
 * JSXGraph 'regularpolygon' tự sinh — không có scene id) phải trả null,
 * để handler có thể filter chúng và không bị cướp click.
 */
function mkRenderer(elements: Map<string, JxgObj>): JxgRenderer {
  return { elements } as unknown as JxgRenderer;
}

function mkBorder(idx: number): JxgObj {
  return { id: `jxg_border_${idx}`, elType: 'segment', elementClass: 2 };
}

function mkPoint(id: string): JxgObj {
  return { id, elType: 'point', elementClass: 1 };
}

describe('idResolvers: jxgIdToSceneId', () => {
  test('direct lookup: jxg obj đã đăng ký trong idMap → trả scene id', () => {
    const pA = mkPoint('jxg_pA');
    const elements = new Map<string, JxgObj>([['A', pA]]);
    const idMap = new Map<string, string>([['jxg_pA', 'A']]);
    expect(jxgIdToSceneId(mkRenderer(elements), idMap, pA)).toBe('A');
  });

  test('polygon border → synthetic id "<polyId>:border:<idx>"', () => {
    const b0 = mkBorder(0);
    const b1 = mkBorder(1);
    const poly: JxgObj = { id: 'jxg_poly', elType: 'polygon', borders: [b0, b1] };
    const elements = new Map<string, JxgObj>([['poly1', poly]]);
    const idMap = new Map<string, string>([['jxg_poly', 'poly1']]);
    expect(jxgIdToSceneId(mkRenderer(elements), idMap, b0)).toBe('poly1:border:0');
    expect(jxgIdToSceneId(mkRenderer(elements), idMap, b1)).toBe('poly1:border:1');
  });

  test('regularpolygon border (same shape as polygon) → synthetic id', () => {
    // JSXGraph regularpolygon trả về polygon (elType='regularpolygon') với
    // borders array y hệt polygon thường — fallback dò borders áp dụng đồng nhất.
    const b0 = mkBorder(0);
    const b3 = mkBorder(3);
    const rpoly: JxgObj = { id: 'jxg_rpoly', elType: 'regularpolygon', borders: [b0, mkBorder(1), mkBorder(2), b3, mkBorder(4)] };
    const elements = new Map<string, JxgObj>([['rpoly1', rpoly]]);
    const idMap = new Map<string, string>([['jxg_rpoly', 'rpoly1']]);
    expect(jxgIdToSceneId(mkRenderer(elements), idMap, b0)).toBe('rpoly1:border:0');
    expect(jxgIdToSceneId(mkRenderer(elements), idMap, b3)).toBe('rpoly1:border:3');
  });

  test('aux point của regularpolygon (không trong idMap, không trong borders) → null', () => {
    // Auxiliary points (vertices) là JSXGraph internals do 'regularpolygon' tự
    // sinh — chúng có jxg id riêng nhưng KHÔNG có scene id. Phải trả null để
    // pointerDown filter chúng và không cho cướp click khỏi border bên cạnh.
    const aux = mkPoint('jxg_aux_2');
    const b0 = mkBorder(0);
    const rpoly: JxgObj = { id: 'jxg_rpoly', elType: 'regularpolygon', borders: [b0, mkBorder(1)] };
    const elements = new Map<string, JxgObj>([['rpoly1', rpoly]]);
    const idMap = new Map<string, string>([['jxg_rpoly', 'rpoly1']]);
    expect(jxgIdToSceneId(mkRenderer(elements), idMap, aux)).toBeNull();
  });

  test('jxgFromSceneId: synthetic "<polyId>:border:<N>" → polygon.borders[N]', () => {
    const b2 = mkBorder(2);
    const rpoly: JxgObj = { id: 'jxg_rpoly', elType: 'regularpolygon', borders: [mkBorder(0), mkBorder(1), b2] };
    const elements = new Map<string, JxgObj>([['rpoly1', rpoly]]);
    expect(jxgFromSceneId(mkRenderer(elements), 'rpoly1:border:2')).toBe(b2);
  });

  test('jxgFromSceneId: regular scene id → element', () => {
    const pA = mkPoint('jxg_pA');
    const elements = new Map<string, JxgObj>([['A', pA]]);
    expect(jxgFromSceneId(mkRenderer(elements), 'A')).toBe(pA);
  });

  test('jxgFromSceneId: id không tồn tại → null', () => {
    const elements = new Map<string, JxgObj>();
    expect(jxgFromSceneId(mkRenderer(elements), 'noexist')).toBeNull();
  });
});
