import { reflectionRule } from '../reflection';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return reflectionRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('reflectionRule', () => {
  it('"D đối xứng H qua BC" → reflectLine (qua đường = cặp đỉnh)', () => {
    const m = run('D đối xứng H qua BC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('D');
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('BC');
  });

  it('"D đối xứng với H qua cạnh BC" → reflectLine', () => {
    const m = run('D đối xứng với H qua cạnh BC');
    const intent = m[0].intents[0] as any;
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('BC');
  });

  it('"Q đối xứng P qua M" → reflectPoint (qua điểm)', () => {
    const m = run('Q đối xứng P qua M');
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('Q');
    expect(intent.constraint.kind).toBe('reflectPoint');
    expect(intent.constraint.of).toBe('P');
    expect(intent.constraint.through).toBe('M');
  });

  it('"Q là điểm đối xứng của P qua điểm M" → reflectPoint', () => {
    const m = run('Q là điểm đối xứng của P qua điểm M');
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('Q');
    expect(intent.constraint.kind).toBe('reflectPoint');
    expect(intent.constraint.of).toBe('P');
    expect(intent.constraint.through).toBe('M');
  });

  it('"D là điểm đối xứng của H qua đường thẳng d" → reflectLine (through tên đường)', () => {
    const m = run('D là điểm đối xứng của H qua đường thẳng d');
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('D');
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('d');
  });

  it('"Gọi K là điểm đối xứng của A qua O" → reflectPoint, tên từ lời dẫn', () => {
    const m = run('Gọi K là điểm đối xứng của A qua O');
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('K');
    expect(intent.constraint.kind).toBe('reflectPoint');
    expect(intent.constraint.of).toBe('A');
    expect(intent.constraint.through).toBe('O');
  });

  it('claim đúng clause id để coverage tính phủ', () => {
    const m = run('Cho tam giác ABC. Gọi D là điểm đối xứng của H qua BC');
    expect(m.length).toBe(1);
    // clause "Gọi D ... qua BC" là clause thứ 2 (id 1)
    expect(m[0].clauseIds).toEqual([1]);
    const intent = m[0].intents[0] as any;
    expect(intent.constraint.through).toBe('BC');
  });

  it('không trích đủ tên điểm dẫn → bỏ qua (escalate)', () => {
    // "Lấy điểm đối xứng ..." nhưng không có tên ảnh trong lời dẫn
    const m = run('Vẽ điểm đối xứng của H qua BC');
    expect(m.length).toBe(0);
  });
});

describe('reflection EN (issue #46 group B)', () => {
  it('"D is the reflection of H over BC" → reflectLine of H through BC', () => {
    const m = run('D is the reflection of H over BC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('add-point');
    expect(intent.name).toBe('D');
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('BC');
  });

  it('"Let D be the reflection of H across line BC" → reflectLine of H through BC', () => {
    const m = run('Let D be the reflection of H across line BC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('D');
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('BC');
  });

  it('"Q is the reflection of P over M" → reflectPoint of P through M', () => {
    const m = run('Q is the reflection of P over M');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('Q');
    expect(intent.constraint.kind).toBe('reflectPoint');
    expect(intent.constraint.of).toBe('P');
    expect(intent.constraint.through).toBe('M');
  });

  it('"D is the reflection of H in the line d" → reflectLine through tên đường d', () => {
    const m = run('D is the reflection of H in the line d');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('D');
    expect(intent.constraint.kind).toBe('reflectLine');
    expect(intent.constraint.of).toBe('H');
    expect(intent.constraint.through).toBe('d');
  });

  it('escalate-safe: "D is the reflection of H." (thiếu trục/điểm) → m.length 0', () => {
    const m = run('D is the reflection of H.');
    expect(m.length).toBe(0);
  });

  it('"D là điểm đối xứng với điểm M qua O" → reflectPoint (với + điểm)', () => {
    const c = (run('Gọi D là điểm đối xứng với điểm M qua O')[0].intents[0] as any).constraint;
    expect(c).toEqual({ kind: 'reflectPoint', of: 'M', through: 'O' });
  });

  it('"đối xứng với D qua tâm O" → reflectPoint qua O (không nhầm thành line "t")', () => {
    const c = (run('Gọi E là điểm đối xứng với D qua tâm O')[0].intents[0] as any).constraint;
    expect(c).toEqual({ kind: 'reflectPoint', of: 'D', through: 'O' });
  });
});
