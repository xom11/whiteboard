import { normalizeIntents } from '../normalizeIntent';
import type { IntentT } from '../intent';

// Smoke: verify normalizer giữ contract pure + idempotent.
// Chỉ đảm bảo normalizeIntents không mutate / lặp lại an toàn.
describe('normalizeIntents — pipeline integration', () => {
  it('không mutate input', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'rectangle', labels: ['A', 'B', 'C', 'D'], variant: 'wide' as never },
    ];
    const before = JSON.stringify(intents);
    normalizeIntents(intents, 'Hình chữ nhật ABCD.');
    expect(JSON.stringify(intents)).toBe(before);
  });

  it('idempotent', () => {
    const intents: IntentT[] = [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'isoceles-AB' as never },
    ];
    const once = normalizeIntents(intents, 'Tam giác ABC cân tại A.');
    const twice = normalizeIntents(once, 'Tam giác ABC cân tại A.');
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });
});
