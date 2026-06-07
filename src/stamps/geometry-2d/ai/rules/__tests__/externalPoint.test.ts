import { externalPointRule } from '../externalPoint';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return externalPointRule.match({ problem, clauses: segmentClauses(problem) });
}

function only(problem: string) {
  const m = run(problem);
  expect(m.length).toBe(1);
  return m[0];
}

describe('externalPointRule (VN)', () => {
  it('"Lấy điểm A nằm ngoài đường tròn (O)" → add-point A externalToCircle circle O', () => {
    const match = only('Lấy điểm A nằm ngoài đường tròn (O)');
    const intent = match.intents[0] as any;
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('A');
    expect(intent.constraint.kind).toBe('externalToCircle');
    expect(intent.constraint.circle).toBe('O');
  });

  it('"Lấy điểm A ở ngoài (O)" → A externalToCircle O', () => {
    const intent = only('Lấy điểm A ở ngoài (O)').intents[0] as any;
    expect(intent.name).toBe('A');
    expect(intent.constraint.kind).toBe('externalToCircle');
    expect(intent.constraint.circle).toBe('O');
  });

  it('"Gọi A là điểm nằm ngoài (O)" → A externalToCircle O', () => {
    const intent = only('Gọi A là điểm nằm ngoài (O)').intents[0] as any;
    expect(intent.name).toBe('A');
    expect(intent.constraint.circle).toBe('O');
  });

  it('"Lấy điểm A ngoài (O)" (không "nằm"/"ở") → A externalToCircle O', () => {
    const intent = only('Lấy điểm A ngoài (O)').intents[0] as any;
    expect(intent.name).toBe('A');
    expect(intent.constraint.circle).toBe('O');
  });

  it('tâm chữ khác "Lấy điểm P nằm ngoài đường tròn (I)" → P externalToCircle I', () => {
    const intent = only('Lấy điểm P nằm ngoài đường tròn (I)').intents[0] as any;
    expect(intent.name).toBe('P');
    expect(intent.constraint.circle).toBe('I');
  });
});

describe('externalPointRule (EN)', () => {
  it('"Take a point A outside the circle (O)." → A externalToCircle O', () => {
    const intent = only('Take a point A outside the circle (O).').intents[0] as any;
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('A');
    expect(intent.constraint.kind).toBe('externalToCircle');
    expect(intent.constraint.circle).toBe('O');
  });

  it('"Let A be a point outside the circle (O)." → A externalToCircle O', () => {
    const intent = only('Let A be a point outside the circle (O).').intents[0] as any;
    expect(intent.name).toBe('A');
    expect(intent.constraint.circle).toBe('O');
  });

  it('"Mark a point A outside circle O." (circle words) → A externalToCircle O', () => {
    const intent = only('Mark a point A outside circle O.').intents[0] as any;
    expect(intent.name).toBe('A');
    expect(intent.constraint.circle).toBe('O');
  });

  it('"Take a point A outside (O)." (paren only) → A externalToCircle O', () => {
    const intent = only('Take a point A outside (O).').intents[0] as any;
    expect(intent.name).toBe('A');
    expect(intent.constraint.circle).toBe('O');
  });
});

describe('externalPointRule — escalate-safe', () => {
  it('"Lấy điểm A trên cạnh BC" (không "ngoài") → không match', () => {
    expect(run('Lấy điểm A trên cạnh BC')).toEqual([]);
  });

  it('"Lấy điểm A ngoài BC" (BC không phải circle target) → không match', () => {
    expect(run('Lấy điểm A ngoài BC')).toEqual([]);
  });

  it('"Take a point A outside BC." (BC không phải circle) → không match', () => {
    expect(run('Take a point A outside BC.')).toEqual([]);
  });
});
