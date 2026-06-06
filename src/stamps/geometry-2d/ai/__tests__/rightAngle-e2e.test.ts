import { intentsToDsl } from '../intentToDsl';
import { completeRightAngle } from '../completeRightAngle';
import { transpile } from '../../dsl';
import type { IntentT } from '../intent';

describe('e2e: góc vuông nhìn đoạn (đề gốc ABC/CK/M)', () => {
  const problem =
    'Cho tam giác nhọn ABC, đường cao CK, H là trực tâm. ' +
    'Gọi M là một điểm trên CK sao cho góc AMB = 90 độ.';

  // Giả lập LLM emit thiếu M → completeRightAngle phải inject
  const llmIntents: IntentT[] = [
    { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
    { op: 'add-point', name: 'K', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
    { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } },
    { op: 'connect', from: 'C', to: 'K', style: 'segment' },
  ];

  it('inject M + transpile ok, circle ẩn, M là intersection', () => {
    const intents = completeRightAngle(llmIntents, problem);
    const dsl = intentsToDsl(intents);
    const r = transpile(dsl);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const objs = Object.values(r.state.objects);
    const m = objs.find((o) => o.label === 'M')!;
    expect(m).toBeDefined();
    expect(m.visible).toBe(true);
    expect(m.kind).toBe('intersection');

    const hiddenCircle = objs.find((o) => o.kind === 'circle' && o.visible === false);
    expect(hiddenCircle).toBeDefined();
  });
});
