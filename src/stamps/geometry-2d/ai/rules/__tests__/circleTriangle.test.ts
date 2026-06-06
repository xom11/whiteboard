import { circleTriangleRule } from '../circleTriangle';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return circleTriangleRule.match({ problem, clauses: segmentClauses(problem) });
}

describe('circleTriangleRule', () => {
  it('"đường tròn ngoại tiếp tam giác ABC" → through3 [A,B,C]', () => {
    const m = run('Vẽ đường tròn ngoại tiếp tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-circle');
    expect(intent.spec).toBe('through3');
    expect(intent.points).toEqual(['A', 'B', 'C']);
    expect(intent.name).toBe('O');
  });

  it('"đường tròn (O) ngoại tiếp tam giác ABC" → name O từ (O)', () => {
    const m = run('Cho đường tròn (O) ngoại tiếp tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('through3');
    expect(intent.name).toBe('O');
    expect(intent.points).toEqual(['A', 'B', 'C']);
  });

  it('tên tâm khác qua "(K)" → name K', () => {
    const m = run('Vẽ đường tròn (K) ngoại tiếp tam giác MNP');
    const intent = m[0].intents[0] as any;
    expect(intent.name).toBe('K');
    expect(intent.points).toEqual(['M', 'N', 'P']);
  });

  it('"đường tròn nội tiếp tam giác ABC" → inscribedIn {triangle}', () => {
    const m = run('Dựng đường tròn nội tiếp tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.op).toBe('draw-circle');
    expect(intent.spec).toBe('inscribedIn');
    expect(intent.triangle).toEqual(['A', 'B', 'C']);
    expect(intent.name).toBe('O');
  });

  it('"đường tròn (I) nội tiếp tam giác DEF" → inscribedIn name I', () => {
    const m = run('Vẽ đường tròn (I) nội tiếp tam giác DEF');
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('inscribedIn');
    expect(intent.name).toBe('I');
    expect(intent.triangle).toEqual(['D', 'E', 'F']);
  });

  it('"tam giác ABC nội tiếp đường tròn (O)" → circumcircle through3', () => {
    const m = run('Cho tam giác ABC nội tiếp đường tròn (O)');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('through3');
    expect(intent.points).toEqual(['A', 'B', 'C']);
  });

  it('clause "Vẽ đường tròn ngoại tiếp" KHÔNG có tam giác ngay sau → bỏ qua (escalate)', () => {
    // Bind PHẢI theo cú pháp gần: token "tam giác XYZ" ngay sau từ khoá. Không có
    // → KHÔNG vơ tam giác đầu đề (chống mis-render) → escalate AI.
    const m = run('Cho tam giác ABC. Vẽ đường tròn ngoại tiếp');
    expect(m.length).toBe(0);
  });

  it('"nội tiếp" trần (không phân loại được) → bỏ qua escalate', () => {
    // không có "đường tròn nội tiếp tam giác" cũng không "tam giác ... nội tiếp
    // đường tròn" → mơ hồ → không emit
    const m = run('Tứ giác ABCD nội tiếp');
    expect(m.length).toBe(0);
  });

  it('không có tam giác → bỏ qua', () => {
    const m = run('Vẽ đường tròn ngoại tiếp');
    expect(m.length).toBe(0);
  });

  // --- BUG FIXES ------------------------------------------------------------

  it('BUG (1): "đường tròn ngoại tiếp tứ giác BCEF" → KHÔNG claim (escalate)', () => {
    // Circle ngoại tiếp TỨ GIÁC chưa hỗ trợ. KHÔNG được dựng through3 [A,B,C] từ
    // tam giác đầu đề (mis-render). Phải bỏ qua để escalate.
    const m = run('Cho tam giác ABC. Vẽ đường tròn ngoại tiếp tứ giác BCEF');
    expect(m.length).toBe(0);
  });

  it('BUG (1b): "đường tròn nội tiếp tứ giác ABCD" → KHÔNG claim (escalate)', () => {
    const m = run('Vẽ đường tròn nội tiếp tứ giác ABCD');
    expect(m.length).toBe(0);
  });

  it('BUG (1c): "đường tròn ngoại tiếp hình vuông ABCD" → KHÔNG claim (escalate)', () => {
    const m = run('Vẽ đường tròn ngoại tiếp hình vuông ABCD');
    expect(m.length).toBe(0);
  });

  it('BUG (2): "Đường tròn ngoại tiếp tam giác ABC" (hoa đầu câu) → through3 [A,B,C]', () => {
    const m = run('Đường tròn ngoại tiếp tam giác ABC');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('through3');
    expect(intent.points).toEqual(['A', 'B', 'C']);
  });

  it('BUG (2b): "Đường tròn nội tiếp tam giác DEF" (hoa đầu câu) → inscribedIn', () => {
    const m = run('Đường tròn nội tiếp tam giác DEF');
    expect(m.length).toBe(1);
    const intent = m[0].intents[0] as any;
    expect(intent.spec).toBe('inscribedIn');
    expect(intent.triangle).toEqual(['D', 'E', 'F']);
  });

  it('BUG (3): 2 tam giác / clause → emit-all đúng từng tam giác theo cú pháp gần', () => {
    const m = run(
      'Vẽ đường tròn ngoại tiếp tam giác ABC và đường tròn nội tiếp tam giác DEF',
    );
    expect(m.length).toBe(1);
    const intents = m[0].intents as any[];
    expect(intents.length).toBe(2);
    expect(intents[0].spec).toBe('through3');
    expect(intents[0].points).toEqual(['A', 'B', 'C']);
    expect(intents[1].spec).toBe('inscribedIn');
    expect(intents[1].triangle).toEqual(['D', 'E', 'F']);
  });

  it('BUG (3b): bind tam giác ngay sau từ khoá (không phải tam giác đầu clause)', () => {
    // "tam giác ABC" đứng đầu nhưng đường tròn ngoại tiếp gắn với "tam giác DEF".
    const m = run('Cho tam giác ABC. Vẽ đường tròn ngoại tiếp tam giác DEF');
    const circ = m.find((r) => (r.intents[0] as any).spec === 'through3');
    expect(circ).toBeDefined();
    expect((circ!.intents[0] as any).points).toEqual(['D', 'E', 'F']);
  });
});
