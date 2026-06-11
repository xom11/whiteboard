// buildAndTranspile (tryDeterministicFigure): attempt 1 theo thứ tự gốc;
// CHỈ khi build-throw / transpile UNKNOWN_REF mới retry với thứ tự topo
// → case đang pass không bao giờ bị reorder (byte-identical, giữ spread coord).
import { buildAndTranspile } from '../deterministic/tryDeterministicFigure';
import { intentsToDsl } from '../intentToDsl';
import type { IntentT } from '../intent';

const tri: IntentT = {
  op: 'draw-shape',
  shape: 'triangle',
  labels: ['A', 'B', 'C'],
  variant: 'any',
} as IntentT;
const mark: IntentT = { op: 'mark-shape', shape: 'triangle', labels: ['A', 'B', 'C'] } as IntentT;

describe('buildAndTranspile order-retry', () => {
  it('mark-shape đứng TRƯỚC draw-shape: trước đây build-throw → nay retry topo thành công', () => {
    // Sanity: thứ tự này hiện ném IntentBuilderError ở intentsToDsl.
    expect(() => intentsToDsl([mark, tri])).toThrow(/chưa định nghĩa/);

    const r = buildAndTranspile([mark, tri]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tResult.ok).toBe(true);
    expect(r.dsl.points.map((p) => p.name)).toEqual(['A', 'B', 'C']);
  });

  it('thứ tự hợp lệ: kết quả y hệt intentsToDsl gốc (không reorder)', () => {
    const intents: IntentT[] = [
      tri,
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } } as IntentT,
      { op: 'connect', from: 'A', to: 'M', style: 'segment' } as IntentT,
    ];
    const direct = intentsToDsl(intents);
    const r = buildAndTranspile(intents);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dsl).toEqual(direct);
  });

  it('fail thật (ref không tồn tại ở mọi thứ tự) → giữ lỗi attempt 1', () => {
    const bad: IntentT = {
      op: 'add-point',
      name: 'K',
      constraint: { kind: 'perpFoot', from: 'Z', onLine: 'ZW' },
    } as IntentT;
    const r = buildAndTranspile([tri, bad]);
    expect(r.ok).toBe(false);
  });
});
