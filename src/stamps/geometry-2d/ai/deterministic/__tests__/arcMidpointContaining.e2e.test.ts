import { tryDeterministicFigure } from '../tryDeterministicFigure';

// Đề: tam giác ABC (AB<AC), tâm ngoại tiếp O + tâm nội tiếp I (CÙNG clause),
// D = hình chiếu I lên BC, M = trung điểm BC, N/T = trung điểm cung BC
// (không chứa A / chứa A). Bao trùm: centers song tâm + arcMidpoint phân phối
// containing/notContaining.
const PROBLEM =
  'Cho tam giác ABC (AB < AC), có tâm ngoại tiếp O và tâm nội tiếp I. ' +
  'D là hình chiếu của I lên BC, M là trung điểm BC. ' +
  'N, T lần lượt là trung điểm của cung BC không chứa A và chứa A.';

describe('arc-midpoint containing + song tâm e2e (no AI)', () => {
  it('qua HẾT gate → figure render-ready', () => {
    const res = tryDeterministicFigure(PROBLEM);
    if (!res.ok) throw new Error(`escalate: ${res.reason} ${res.detail ?? ''}`);
    const { dsl } = res.figure;

    const byName = (n: string) => dsl.points.find((p) => p.name === n);

    // Cả circumcenter O và incenter I phải có mặt (else if cũ nuốt I).
    expect(byName('O')!.kind).toBe('circumcenter');
    expect(byName('I')!.kind).toBe('incenter');

    // D = perpFoot của I lên BC.
    const D = byName('D')!;
    expect(D.kind).toBe('perpFoot');
    expect((D as any).from).toBe('I');

    // M = midpoint BC.
    expect(byName('M')!.kind).toBe('midpoint');

    // N = trung điểm cung BC KHÔNG chứa A; T = trung điểm cung BC CHỨA A.
    const N = byName('N')! as any;
    expect(N.kind).toBe('arcMidpoint');
    expect(N.notContaining).toBe('A');
    expect(N.containing).toBeUndefined();

    const T = byName('T')! as any;
    expect(T.kind).toBe('arcMidpoint');
    expect(T.containing).toBe('A');
    expect(T.notContaining).toBeUndefined();
  });
});
