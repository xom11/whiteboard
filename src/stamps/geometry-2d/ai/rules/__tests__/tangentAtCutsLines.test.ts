import { tangentAtCutsLinesRule } from '../tangentAtCutsLines';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => tangentAtCutsLinesRule.match({ problem: p, clauses: segmentClauses(p) });

describe('tangentAtCutsLinesRule', () => {
  it('"Tiếp tuyến của (O) tại C cắt AD, AB lần lượt tại P, Q"', () => {
    const P = 'Dựng đường tròn tâm O bán kính OC. Tiếp tuyến của (O) tại C cắt AD, AB lần lượt tại P, Q.';
    const intents = run(P).flatMap((m) => m.intents) as any[];
    const line = intents.find((i) => i.op === 'draw-line');
    expect(line).toMatchObject({ kind: 'tangentAt', through: 'C', circle: 'O' });
    const pts = intents.filter((i) => i.op === 'add-point');
    expect(pts.map((p) => `${p.name}:${p.constraint.of.join('∩')}`)).toEqual(['P:tC∩AD', 'Q:tC∩AB']);
  });

  it('thứ tự "tiếp tuyến tại C của (O) cắt …"', () => {
    const P = 'Cho đường tròn (O). Tiếp tuyến tại C của (O) cắt AD, AB tại P, Q.';
    const line = run(P).flatMap((m) => m.intents).find((i: any) => i.op === 'draw-line') as any;
    expect(line).toMatchObject({ kind: 'tangentAt', through: 'C' });
  });

  it('cắt tia tiếp tuyến đặt tên "Ax, By" (tiếp tuyến tại M cắt Ax, By tại C, D)', () => {
    const P =
      'Cho nửa đường tròn (O) đường kính AB. Kẻ các tia tiếp tuyến Ax, By. Tiếp tuyến tại M cắt Ax, By lần lượt tại C, D.';
    const intents = run(P).flatMap((m) => m.intents) as any[];
    const line = intents.find((i) => i.op === 'draw-line');
    expect(line).toMatchObject({ kind: 'tangentAt', through: 'M' });
    const pts = intents.filter((i) => i.op === 'add-point');
    expect(pts.map((p) => `${p.name}:${p.constraint.of.join('∩')}`)).toEqual(['C:tM∩Ax', 'D:tM∩By']);
  });

  it('"tại E và tại F" — "tại" lặp trước giao điểm 2 (vao10:80)', () => {
    const P =
      'Cho đường tròn (O;R). Tiếp tuyến của đường tròn tại M cắt AB và AC lần lượt tại E và tại F.';
    const intents = run(P).flatMap((m) => m.intents) as any[];
    const line = intents.find((i) => i.op === 'draw-line');
    expect(line).toMatchObject({ kind: 'tangentAt', through: 'M', circle: 'O' });
    const pts = intents.filter((i) => i.op === 'add-point');
    expect(pts.map((p) => `${p.name}:${p.constraint.of.join('∩')}`)).toEqual([
      'E:tM∩AB',
      'F:tM∩AC',
    ]);
  });

  it('"với đường tròn" sau tiếp điểm + "kéo dài" (httcd:194 phrasing, tiếp điểm HOA)', () => {
    const P =
      'Cho hình chữ nhật ABCD nội tiếp đường tròn (O). Tiếp tuyến tại C với đường tròn cắt AB, AD kéo dài lần lượt tại E và F.';
    const intents = run(P).flatMap((m) => m.intents) as any[];
    const line = intents.find((i) => i.op === 'draw-line');
    expect(line).toMatchObject({ kind: 'tangentAt', through: 'C', circle: 'O' });
    const pts = intents.filter((i) => i.op === 'add-point');
    expect(pts.map((p) => `${p.name}:${p.constraint.of.join('∩')}`)).toEqual([
      'E:tC∩AB',
      'F:tC∩AD',
    ]);
  });

  it('không có circle → không claim', () => {
    expect(run('Tiếp tuyến tại C cắt AD, AB tại P, Q').length).toBe(0);
  });
});
