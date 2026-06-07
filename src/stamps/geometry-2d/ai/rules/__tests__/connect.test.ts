import { connectRule } from '../connect';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return connectRule.match({ problem, clauses: segmentClauses(problem) });
}

function intent(problem: string) {
  const m = run(problem);
  return m[0]?.intents[0] as any;
}

describe('connectRule', () => {
  it('"đoạn AB" → connect segment', () => {
    const i = intent('Vẽ đoạn AB');
    expect(i.op).toBe('connect');
    expect(i.from).toBe('A');
    expect(i.to).toBe('B');
    expect(i.style).toBe('segment');
  });

  it('"đoạn thẳng MN" → connect segment', () => {
    const i = intent('Kẻ đoạn thẳng MN');
    expect(i.op).toBe('connect');
    expect(i.from).toBe('M');
    expect(i.to).toBe('N');
    expect(i.style).toBe('segment');
  });

  it('"cạnh AB" → connect segment', () => {
    const i = intent('Vẽ cạnh AB');
    expect(i.style).toBe('segment');
    expect(i.from).toBe('A');
    expect(i.to).toBe('B');
  });

  it('"nối A với B" → connect segment', () => {
    const i = intent('Nối A với B');
    expect(i.op).toBe('connect');
    expect(i.from).toBe('A');
    expect(i.to).toBe('B');
    expect(i.style).toBe('segment');
  });

  it('"nối M và N" → connect segment', () => {
    const i = intent('Nối M và N');
    expect(i.from).toBe('M');
    expect(i.to).toBe('N');
    expect(i.style).toBe('segment');
  });

  it('"kẻ CD" → connect segment', () => {
    const i = intent('Kẻ CD');
    expect(i.from).toBe('C');
    expect(i.to).toBe('D');
    expect(i.style).toBe('segment');
  });

  it('"đường thẳng AB" → connect line', () => {
    const i = intent('Vẽ đường thẳng AB');
    expect(i.op).toBe('connect');
    expect(i.from).toBe('A');
    expect(i.to).toBe('B');
    expect(i.style).toBe('line');
  });

  it('"tia AB" → connect ray', () => {
    const i = intent('Vẽ tia AB');
    expect(i.op).toBe('connect');
    expect(i.from).toBe('A');
    expect(i.to).toBe('B');
    expect(i.style).toBe('ray');
  });

  it('KHÔNG khớp "tam giác ABC" (3 ký tự, không từ khoá vẽ)', () => {
    expect(run('Cho tam giác ABC')).toEqual([]);
  });

  it('KHÔNG khớp "tia phân giác" (không phải cặp đỉnh HOA)', () => {
    expect(run('Vẽ tia phân giác của góc A')).toEqual([]);
  });

  it('SUPPRESS ray cho cụm "tia đối của tia XY" (Issue #46 nhóm A: tránh ray sai hướng)', () => {
    // "tia đối của tia BA" = tia gốc B đi NGƯỢC hướng A. Điểm mới trên tia đối
    // (xa A). Ray naive B→A minh hoạ SAI hướng (tia gốc). connect PHẢI suppress;
    // pointAtDistance lo dựng điểm mới đúng trên tia đối.
    expect(run('Trên tia đối của tia BA lấy điểm D sao cho BD = AB')).toEqual([]);
  });

  it('SUPPRESS chỉ ray trong cụm "tia đối", ray trần khác trong cùng clause vẫn emit', () => {
    // "tia đối của tia BA" bị suppress; "tia CE" trần (không "đối") vẫn ray C→E.
    const m = run('Trên tia đối của tia BA lấy D. Vẽ tia CE');
    const styles = m.flatMap((x) => x.intents.map((i: any) => `${i.from}${i.to}:${i.style}`));
    expect(styles).toContain('CE:ray');
    expect(styles).not.toContain('BA:ray');
    expect(styles).not.toContain('AB:ray');
  });

  it('"tia BA" trần (KHÔNG "đối") vẫn emit ray B→A (không phá case thường)', () => {
    const i = intent('Vẽ tia BA');
    expect(i.style).toBe('ray');
    expect(i.from).toBe('B');
    expect(i.to).toBe('A');
  });

  it('nhiều cặp (mỗi cặp có từ khoá riêng) trong 1 clause → nhiều intent cùng clauseId', () => {
    const m = run('Vẽ đoạn AB và đoạn CD');
    expect(m.length).toBe(1);
    const styles = m[0].intents.map((x: any) => `${x.from}${x.to}:${x.style}`);
    expect(styles).toContain('AB:segment');
    expect(styles).toContain('CD:segment');
    // cùng 1 clauseId cho mọi intent
    expect(m[0].clauseIds.length).toBe(1);
  });

  it('BẢO THỦ: cặp KHÔNG có từ khoá vẽ riêng thì bỏ qua ("Kẻ AB và CD" chỉ claim AB)', () => {
    const m = run('Kẻ AB và CD');
    expect(m.length).toBe(1);
    const styles = m[0].intents.map((x: any) => `${x.from}${x.to}:${x.style}`);
    expect(styles).toEqual(['AB:segment']);
  });

  it('hỗn hợp style: đường thẳng AB + tia CD trong 1 clause', () => {
    const m = run('Vẽ đường thẳng AB và tia CD');
    expect(m.length).toBe(1);
    const styles = m[0].intents.map((x: any) => `${x.from}${x.to}:${x.style}`);
    expect(styles).toContain('AB:line');
    expect(styles).toContain('CD:ray');
  });

  it('claim đúng clauseId', () => {
    const m = run('Cho tam giác ABC. Vẽ đoạn AB');
    expect(m.length).toBe(1);
    const clauses = segmentClauses('Cho tam giác ABC. Vẽ đoạn AB');
    const target = clauses.find((c) => /đoạn AB/.test(c.text))!;
    expect(m[0].clauseIds).toEqual([target.id]);
  });
});
