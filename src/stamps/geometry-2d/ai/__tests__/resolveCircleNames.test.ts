// src/stamps/geometry-2d/ai/__tests__/resolveCircleNames.test.ts
//
// TDD: preprocessor giải quyết naming collision giữa circle và point.
// Trong notation Việt "(O)" là tâm — nhưng schema DSL global-unique name nên
// circle X + point X không cùng tồn tại được. Preprocessor inject point + rename
// circle.

import { resolveCircleNameCollisions } from '../resolveCircleNames';
import type { IntentT } from '../intent';

describe('resolveCircleNameCollisions', () => {
  it('no collision → pass through unchanged', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'w', spec: 'through3', points: ['A', 'B', 'C'] },
    ];
    expect(resolveCircleNameCollisions(intents)).toEqual(intents);
  });

  it('through3 collision: circle name "O" referenced as point → inject circumcenter + rename', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'connect', from: 'M', to: 'O', style: 'segment' },
    ];
    const result = resolveCircleNameCollisions(intents);

    expect(result).toEqual([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'O', constraint: { kind: 'circumcenter', of: ['A', 'B', 'C'] } },
      { op: 'draw-circle', name: 'O_c', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'connect', from: 'M', to: 'O', style: 'segment' },
    ]);
  });

  it('inscribedIn collision: circle name "I" referenced as point → inject incenter + rename', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A', 'B', 'C'] },
      { op: 'connect', from: 'I', to: 'A', style: 'segment' },
    ];
    const result = resolveCircleNameCollisions(intents);
    expect(result).toEqual([
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'I', constraint: { kind: 'incenter', of: ['A', 'B', 'C'] } },
      { op: 'draw-circle', name: 'I_c', spec: 'inscribedIn', triangle: ['A', 'B', 'C'] },
      { op: 'connect', from: 'I', to: 'A', style: 'segment' },
    ]);
  });

  it('rewrite circle ref trong tangencyPoint, secondIntersection (cần follow rename)', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'O', onLine: 'BC' } },
      { op: 'add-point', name: 'M', constraint: { kind: 'secondIntersection', line: 'AI', circle: 'O', other: 'A' } },
      { op: 'connect', from: 'M', to: 'O', style: 'segment' },
    ];
    const result = resolveCircleNameCollisions(intents);
    // D ref tangencyPoint.circle phải rename to 'O_c'
    expect(result.find((i) => i.op === 'add-point' && i.name === 'D')).toEqual({
      op: 'add-point',
      name: 'D',
      constraint: { kind: 'tangencyPoint', circle: 'O_c', onLine: 'BC' },
    });
    // M ref secondIntersection.circle phải rename to 'O_c'
    expect(result.find((i) => i.op === 'add-point' && i.name === 'M')).toEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'secondIntersection', line: 'AI', circle: 'O_c', other: 'A' },
    });
    // connect M→O: O context = point → KHÔNG rename
    expect(result.find((i) => i.op === 'connect')).toEqual({
      op: 'connect', from: 'M', to: 'O', style: 'segment',
    });
  });

  it('rewrite circle ref trong tangentFromExt (draw-line)', () => {
    const intents: IntentT[] = [
      { op: 'add-point', name: 'O', constraint: { kind: 'free' } },
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3 },
      // ↑ centerRadius collision không inject (xem test riêng); test này focus phần khác
      { op: 'add-point', name: 'A', constraint: { kind: 'free' } },
      { op: 'draw-line', name: 'tA', kind: 'tangentFromExt', from: 'A', circle: 'O', which: 'both' },
    ];
    // centerRadius collision với existing add-point O free → preprocessor skip inject
    // nhưng vẫn rename circle vì O đã có
    const result = resolveCircleNameCollisions(intents);

    const circleIntent = result.find((i) => i.op === 'draw-circle');
    expect(circleIntent?.name).toBe('O_c');
    expect((circleIntent as { center?: string }).center).toBe('O'); // center ref vẫn point O

    const tangent = result.find((i) => i.op === 'draw-line');
    expect((tangent as { circle?: string }).circle).toBe('O_c');
  });

  it('rewrite circle ref trong circleIntersection (c1, c2)', () => {
    const intents: IntentT[] = [
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'cO', radius: 2 },
      { op: 'draw-circle', name: 'P', spec: 'centerRadius', center: 'cP', radius: 2 },
      { op: 'add-point', name: 'A', constraint: { kind: 'circleIntersection', c1: 'O', c2: 'P', which: 0 } },
      { op: 'connect', from: 'A', to: 'O', style: 'segment' }, // O referenced as point
      { op: 'connect', from: 'A', to: 'P', style: 'segment' }, // P referenced as point
    ];
    // Cả O, P đều collide
    const result = resolveCircleNameCollisions(intents);
    const interIntent = result.find(
      (i) => i.op === 'add-point' && i.name === 'A',
    ) as { constraint: { c1: string; c2: string } } | undefined;
    expect(interIntent?.constraint.c1).toBe('O_c');
    expect(interIntent?.constraint.c2).toBe('P_c');
  });

  it('centerRadius/centerThrough collision: KHÔNG inject center point (center explicit) nhưng vẫn rename circle', () => {
    const intents: IntentT[] = [
      { op: 'add-point', name: 'O', constraint: { kind: 'free' } },
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3 },
      { op: 'connect', from: 'O', to: 'O', style: 'segment' }, // contrived, but exercises rename
    ];
    const result = resolveCircleNameCollisions(intents);
    // Không nên double-insert add-point O — pre-existing
    const addPointCount = result.filter((i) => i.op === 'add-point' && i.name === 'O').length;
    expect(addPointCount).toBe(1);
    // Circle phải rename
    const circle = result.find((i) => i.op === 'draw-circle');
    expect(circle?.name).toBe('O_c');
  });

  it('pre-existing add-point cùng tên với circle → không double-insert', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'O', constraint: { kind: 'circumcenter', of: ['A', 'B', 'C'] } },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'connect', from: 'M', to: 'O', style: 'segment' },
    ];
    const result = resolveCircleNameCollisions(intents);
    const oPoints = result.filter((i) => i.op === 'add-point' && i.name === 'O');
    expect(oPoints).toHaveLength(1); // chỉ 1 add-point O, không double
    expect(result.find((i) => i.op === 'draw-circle')?.name).toBe('O_c');
  });

  it('pre-existing add-point cùng tên với circle vẫn rename dù chưa có point ref khác', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'H', 'E'], variant: 'any' },
      { op: 'add-point', name: 'O', constraint: { kind: 'circumcenter', of: ['A', 'H', 'E'] } },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'H', 'E'] },
    ];
    const result = resolveCircleNameCollisions(intents);

    expect(result.filter((i) => i.op === 'add-point' && i.name === 'O')).toHaveLength(1);
    expect(result.find((i) => i.op === 'draw-circle')?.name).toBe('O_c');
  });

  it('multiple collisions cùng intent set', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A', 'B', 'C'] },
      { op: 'connect', from: 'O', to: 'I', style: 'segment' },
    ];
    const result = resolveCircleNameCollisions(intents);
    // Cả 2 inject center
    expect(result.find((i) => i.op === 'add-point' && i.name === 'O')).toBeDefined();
    expect(result.find((i) => i.op === 'add-point' && i.name === 'I')).toBeDefined();
    // Cả 2 circle rename
    const circles = result.filter((i) => i.op === 'draw-circle');
    expect(circles.map((c) => c.name).sort()).toEqual(['I_c', 'O_c']);
  });

  it('edge name "BC" (composite) KHÔNG bị nhầm là point ref', () => {
    // intersection.of là array các edge name (2-letter), không phải point ref
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      // intersection.of: ['AC','BD'] — KHÔNG match circle name 'O'
      { op: 'add-point', name: 'P', constraint: { kind: 'intersection', of: ['AC', 'BD'] } },
    ];
    // O không bị reference làm point → không collide → pass through
    const result = resolveCircleNameCollisions(intents);
    expect(result).toEqual(intents);
  });

  it('cau-03 regression: centerThrough với center===name → inject free point + rename', () => {
    // AI gen: draw-circle name=O spec=centerThrough center=O through=C — đặt
    // cùng letter cho circle name và center point ("(O)" notation Việt).
    // add-point K secondIntersection line:"OC" — Item 4 edge-extract trigger
    // collision detection. Phải inject add-point O free + rename circle.
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'centerThrough', center: 'O', through: 'C' },
      {
        op: 'add-point',
        name: 'K',
        constraint: { kind: 'secondIntersection', line: 'OC', circle: 'O', other: 'C' },
      },
    ];
    const result = resolveCircleNameCollisions(intents);
    const oPoint = result.find((i) => i.op === 'add-point' && i.name === 'O');
    expect(oPoint).toBeDefined();
    expect(oPoint!.constraint).toMatchObject({ kind: 'free' });
    expect(result.find((i) => i.op === 'draw-circle')?.name).toBe('O_c');
  });

  it('centerRadius với center===name → cùng cách', () => {
    const intents: IntentT[] = [
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3 },
      {
        op: 'add-point',
        name: 'P',
        constraint: { kind: 'secondIntersection', line: 'OP', circle: 'O', other: 'O' },
      },
    ];
    const result = resolveCircleNameCollisions(intents);
    const oPoint = result.find((i) => i.op === 'add-point' && i.name === 'O');
    expect(oPoint).toBeDefined();
    expect(oPoint!.constraint).toMatchObject({ kind: 'free' });
  });

  it('centerThrough với center !== name → KHÔNG inject (caller tự lo)', () => {
    // Vd circle name="W" center="P" (P phải được define ở chỗ khác). Edge ref
    // "WP" có thể trigger rename W→W_c nhưng P là explicit ref, KHÔNG cần inject.
    const intents: IntentT[] = [
      { op: 'add-point', name: 'P', constraint: { kind: 'free' } },
      { op: 'draw-circle', name: 'W', spec: 'centerThrough', center: 'P', through: 'A' },
      {
        op: 'add-point',
        name: 'X',
        constraint: { kind: 'secondIntersection', line: 'WA', circle: 'W', other: 'A' },
      },
    ];
    const result = resolveCircleNameCollisions(intents);
    // Chỉ inject point khi center===name. Ở đây center=P khác name=W.
    const wPoint = result.find((i) => i.op === 'add-point' && i.name === 'W');
    expect(wPoint).toBeUndefined();
    expect(result.find((i) => i.op === 'draw-circle')?.name).toBe('W_c');
  });

  it('cau-09 case: line ref "AO" → detect O collision dù không có connect tới O', () => {
    // Bug: cau-09 saved intents có
    //   add-point D secondIntersection line:"AO" circle:"O"
    // nhưng KHÔNG có connect from:A to:O. Trước fix, collectPointRefs bỏ qua
    // 2-letter line refs → không detect O collision → circle giữ tên "O" →
    // transpile throw "id not assigned for AO".
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      {
        op: 'add-point',
        name: 'D',
        constraint: { kind: 'secondIntersection', line: 'AO', circle: 'O', other: 'A' },
      },
    ];
    const result = resolveCircleNameCollisions(intents);
    // Phải inject add-point O circumcenter + rename circle
    const oPoint = result.find((i) => i.op === 'add-point' && i.name === 'O');
    expect(oPoint).toBeDefined();
    const circle = result.find((i) => i.op === 'draw-circle');
    expect(circle?.name).toBe('O_c');
    // Circle ref trong secondIntersection rewrite sang O_c
    const dIntent = result.find((i) => i.op === 'add-point' && i.name === 'D');
    expect(dIntent?.constraint).toMatchObject({ circle: 'O_c' });
  });

  it('intersection.of edge refs cũng trigger collision', () => {
    // Cau hypothetical: intersection of:["AO","BC"] với circle "O" và "B" —
    // edge ref tách thành single chars để detect.
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      {
        op: 'add-point',
        name: 'X',
        constraint: { kind: 'intersection', of: ['AO', 'BC'] },
      },
    ];
    const result = resolveCircleNameCollisions(intents);
    expect(result.find((i) => i.op === 'add-point' && i.name === 'O')).toBeDefined();
  });

  it('rewrite circle ref trong radicalAxis (circle1, circle2) — issue #47 construct 2', () => {
    // circleRadius dựng circle theo center letter: draw-circle name=O center=O,
    // name=I center=I (centerRadius). center ref O/I collide → inject free point
    // + rename circle O→O_c, I→I_c. radicalAxis tham chiếu circle qua name → phải
    // follow rename.
    const intents: IntentT[] = [
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3 },
      { op: 'draw-circle', name: 'I', spec: 'centerRadius', center: 'I', radius: 2 },
      { op: 'draw-line', name: 'radOI', kind: 'radicalAxis', circle1: 'O', circle2: 'I' },
    ];
    const result = resolveCircleNameCollisions(intents);

    // Cả 2 circle rename.
    const circles = result.filter((i) => i.op === 'draw-circle');
    expect(circles.map((c) => c.name).sort()).toEqual(['I_c', 'O_c']);

    // radicalAxis refs rewrite sang O_c / I_c.
    const rad = result.find((i) => i.op === 'draw-line') as
      | { circle1?: string; circle2?: string } | undefined;
    expect(rad?.circle1).toBe('O_c');
    expect(rad?.circle2).toBe('I_c');
  });

  it('point name created bởi draw-shape labels → treated as existing point', () => {
    // Nếu Claude emit draw-shape MNPQ rồi draw-circle M (trùng tên), connect X→M
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'square', labels: ['M', 'N', 'P', 'Q'], variant: 'standard' },
      { op: 'draw-circle', name: 'M', spec: 'through3', points: ['M', 'N', 'P'] }, // contrived
      { op: 'connect', from: 'M', to: 'N', style: 'segment' }, // M referenced as point
    ];
    // M tồn tại từ draw-shape → không inject add-point, nhưng rename circle
    const result = resolveCircleNameCollisions(intents);
    const mPoints = result.filter((i) => i.op === 'add-point' && i.name === 'M');
    expect(mPoints).toHaveLength(0); // không inject
    expect(result.find((i) => i.op === 'draw-circle')?.name).toBe('M_c');
  });

  // --- circle-by-center ref: circle đã pre-named "O_c" (circleDiameter) nhưng
  // rule khác (lineCircleIntersection) emit ref thô "O". Phải rewrite O → O_c.
  it('Bài 15: circleDiameter tạo O_c + center O, secondIntersection ref thô "O" → rewrite O_c', () => {
    const intents: IntentT[] = [
      { op: 'add-point', name: 'M', constraint: { kind: 'onSegment', of: 'AC' } },
      { op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'MC' } },
      { op: 'draw-circle', name: 'O_c', spec: 'diameter', endpoints: ['M', 'C'] } as unknown as IntentT,
      { op: 'add-point', name: 'D', constraint: { kind: 'secondIntersection', line: 'BM', circle: 'O', other: 'B' } },
      { op: 'add-point', name: 'S', constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A' } },
    ];
    const result = resolveCircleNameCollisions(intents);
    const d = result.find((i) => i.op === 'add-point' && i.name === 'D');
    expect(d?.constraint).toMatchObject({ circle: 'O_c' });
    const s = result.find((i) => i.op === 'add-point' && i.name === 'S');
    expect(s?.constraint).toMatchObject({ circle: 'O_c' });
    // KHÔNG đổi tên circle (đã là O_c), KHÔNG double-inject center O
    expect(result.filter((i) => i.op === 'draw-circle')).toHaveLength(1);
    expect(result.filter((i) => i.op === 'add-point' && i.name === 'O')).toHaveLength(1);
  });

  it('circle-by-center: onCircle + tangencyPoint ref thô "O" cũng rewrite khi chỉ có O_c', () => {
    const intents: IntentT[] = [
      { op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'AB' } },
      { op: 'draw-circle', name: 'O_c', spec: 'diameter', endpoints: ['A', 'B'] } as unknown as IntentT,
      { op: 'add-point', name: 'C', constraint: { kind: 'onCircle', circle: 'O', theta: 1 } },
      { op: 'add-point', name: 'T', constraint: { kind: 'tangencyPoint', circle: 'O', onLine: 'AB' } },
    ];
    const result = resolveCircleNameCollisions(intents);
    expect(result.find((i) => i.op === 'add-point' && i.name === 'C')?.constraint).toMatchObject({ circle: 'O_c' });
    expect(result.find((i) => i.op === 'add-point' && i.name === 'T')?.constraint).toMatchObject({ circle: 'O_c' });
  });

  it('circle-by-center: KHÔNG rewrite khi circle "O" thật sự tồn tại', () => {
    // Nếu đã có circle tên đúng "O" thì ref "O" hợp lệ, không đổi thành O_c.
    const intents: IntentT[] = [
      { op: 'draw-circle', name: 'O_c', spec: 'diameter', endpoints: ['A', 'B'] } as unknown as IntentT,
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'cen', radius: 2 },
      { op: 'add-point', name: 'C', constraint: { kind: 'onCircle', circle: 'O', theta: 1 } },
    ];
    const result = resolveCircleNameCollisions(intents);
    expect(result.find((i) => i.op === 'add-point' && i.name === 'C')?.constraint).toMatchObject({ circle: 'O' });
  });
});
