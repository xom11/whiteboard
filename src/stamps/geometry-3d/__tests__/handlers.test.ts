import { createHandlerContext, handleToolStep, type ClickHit } from '../editor/handlers';
import type { SerializedElement3D } from '../serialize';

function buildCtx(overrides: Partial<Parameters<typeof createHandlerContext>[0]> = {}) {
  const log: SerializedElement3D[] = [];
  const objMap = new Map<string, unknown>();
  let idCounter = 1;
  const create = jest.fn((_kind: string) => ({ _isJxg: true, _id: idCounter }));
  return {
    log,
    objMap,
    create,
    ctx: createHandlerContext({
      view: { create },
      pushLog: (e: SerializedElement3D) => log.push(e),
      objMap,
      nextId: () => `id-${idCounter++}`,
      isDark: false,
      promptCoords: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
      promptNumber: jest.fn(() => 1),
      promptText: jest.fn(() => 'A'),
      notify: jest.fn(),
      ...overrides,
    }),
  };
}

const hit = (x = 0, y = 0, z = 0, existingPointId?: string): ClickHit => ({
  x3: x,
  y3: y,
  z3: z,
  existingPointId,
});

describe('handlers — primitives', () => {
  it('move tool: no-op, không tạo gì', () => {
    const { ctx, log } = buildCtx();
    handleToolStep(ctx, 'move', hit());
    expect(log.length).toBe(0);
  });

  it('point tool: prompt coords → 1 point3d trong log', () => {
    const promptCoords = jest.fn(() => ({ x: 1, y: 2, z: 3 }));
    const { ctx, log } = buildCtx({ promptCoords });
    handleToolStep(ctx, 'point', hit());
    expect(log.length).toBe(1);
    expect(log[0].type).toBe('point3d');
    expect(log[0].parents).toEqual([1, 2, 3]);
  });

  it('segment tool: 2 click → 2 points + 1 segment3d', () => {
    const { ctx, log } = buildCtx();
    handleToolStep(ctx, 'segment', hit(0, 0, 0));
    handleToolStep(ctx, 'segment', hit(1, 0, 0));
    const types = log.map((e) => e.type);
    expect(types).toEqual(['point3d', 'point3d', 'segment3d']);
  });

  it('line tool: 2 click → 2 points + 1 line3d', () => {
    const { ctx, log } = buildCtx();
    handleToolStep(ctx, 'line', hit(0, 0, 0));
    handleToolStep(ctx, 'line', hit(1, 0, 0));
    const types = log.map((e) => e.type);
    expect(types).toEqual(['point3d', 'point3d', 'line3d']);
  });

  it('plane tool: 3 click → 3 points + 1 plane3d', () => {
    const { ctx, log } = buildCtx();
    handleToolStep(ctx, 'plane', hit(0, 0, 0));
    handleToolStep(ctx, 'plane', hit(1, 0, 0));
    handleToolStep(ctx, 'plane', hit(0, 1, 0));
    const types = log.map((e) => e.type);
    expect(types).toEqual(['point3d', 'point3d', 'point3d', 'plane3d']);
  });

  it('triangle: 3 click → 3 points + 1 polygon3d', () => {
    const { ctx, log } = buildCtx();
    handleToolStep(ctx, 'triangle', hit(0, 0, 0));
    handleToolStep(ctx, 'triangle', hit(2, 0, 0));
    handleToolStep(ctx, 'triangle', hit(1, 2, 0));
    const types = log.map((e) => e.type);
    expect(types[types.length - 1]).toBe('polygon3d');
  });

  it('polygon: click trở lại điểm đầu → đóng polygon3d', () => {
    // Simulate: 3 fresh clicks + 1 click on first point's id
    const { ctx, log } = buildCtx();
    handleToolStep(ctx, 'polygon', hit(0, 0, 0));
    const firstId = log[0].id;
    handleToolStep(ctx, 'polygon', hit(2, 0, 0));
    handleToolStep(ctx, 'polygon', hit(1, 2, 0));
    handleToolStep(ctx, 'polygon', { x3: 0, y3: 0, z3: 0, existingPointId: firstId });
    expect(log[log.length - 1].type).toBe('polygon3d');
  });

  it('label tool yêu cầu existingPointId', () => {
    const promptText = jest.fn(() => 'Apex');
    const { ctx, log } = buildCtx({ promptText });
    // First create a point manually
    handleToolStep(ctx, 'point', hit());
    const ptId = log[0].id;
    handleToolStep(ctx, 'label', { x3: 0, y3: 0, z3: 0, existingPointId: ptId });
    expect(log[log.length - 1].type).toBe('text3d');
    expect(log[log.length - 1].label).toBe('Apex');
  });

  it('label tool: không có existingPointId → no-op', () => {
    const { ctx, log } = buildCtx();
    handleToolStep(ctx, 'label', hit());
    expect(log.length).toBe(0);
  });
});

describe('handlers — solids', () => {
  it('tetrahedron: 4 click → 4 points + polyhedron3d', () => {
    const { ctx, log } = buildCtx();
    handleToolStep(ctx, 'tetrahedron', hit(0, 0, 0));
    handleToolStep(ctx, 'tetrahedron', hit(2, 0, 0));
    handleToolStep(ctx, 'tetrahedron', hit(1, 2, 0));
    handleToolStep(ctx, 'tetrahedron', hit(1, 1, 2));
    const types = log.map((e) => e.type);
    expect(types.filter((t) => t === 'point3d').length).toBe(4);
    expect(types[types.length - 1]).toBe('polyhedron3d');
  });

  it('parallelepiped: 1 origin click + 3 vector prompts → 8 points + polyhedron3d', () => {
    const promptCoords = jest.fn()
      .mockReturnValueOnce({ x: 2, y: 0, z: 0 })
      .mockReturnValueOnce({ x: 0, y: 2, z: 0 })
      .mockReturnValueOnce({ x: 0, y: 0, z: 2 });
    const { ctx, log } = buildCtx({ promptCoords });
    handleToolStep(ctx, 'parallelepiped', hit(0, 0, 0));
    expect(promptCoords).toHaveBeenCalledTimes(3);
    const pointCount = log.filter((e) => e.type === 'point3d').length;
    // 1 origin (created by resolvePoint) + 7 derived = 8
    expect(pointCount).toBe(8);
    expect(log[log.length - 1].type).toBe('polyhedron3d');
  });

  it('prism: polygon base + close + height → prism', () => {
    const promptNumber = jest.fn(() => 3);
    const { ctx, log } = buildCtx({ promptNumber });
    handleToolStep(ctx, 'prism', hit(0, 0, 0));
    const firstId = log[0].id;
    handleToolStep(ctx, 'prism', hit(2, 0, 0));
    handleToolStep(ctx, 'prism', hit(1, 2, 0));
    handleToolStep(ctx, 'prism', { x3: 0, y3: 0, z3: 0, existingPointId: firstId });
    expect(promptNumber).toHaveBeenCalled();
    expect(log[log.length - 1].type).toBe('polyhedron3d');
  });

  it('pyramid: polygon base + close + apex → pyramid', () => {
    const { ctx, log } = buildCtx();
    handleToolStep(ctx, 'pyramid', hit(0, 0, 0));
    const firstId = log[0].id;
    handleToolStep(ctx, 'pyramid', hit(2, 0, 0));
    handleToolStep(ctx, 'pyramid', hit(1, 2, 0));
    handleToolStep(ctx, 'pyramid', { x3: 0, y3: 0, z3: 0, existingPointId: firstId });
    handleToolStep(ctx, 'pyramid', hit(1, 1, 2)); // apex
    expect(log[log.length - 1].type).toBe('polyhedron3d');
  });
});
