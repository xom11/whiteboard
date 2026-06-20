import { secantRule } from '../secant';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return secantRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents as any[]);
}

describe('secantRule', () => {
  it('"đường thẳng d đi qua A cắt đường tròn tại D và E" → D onCircle, E secondIntersection(AD)', () => {
    const all = run('Cho đường tròn (O). Một đường thẳng d đi qua A cắt đường tròn tại D và E');
    expect(all).toContainEqual(expect.objectContaining({ op: 'add-point', name: 'D', constraint: expect.objectContaining({ kind: 'onCircle' }) }));
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'E',
      constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'D' },
    });
  });

  // vao10:100/httcd:208 — "tại HAI ĐIỂM B và C" (cụm "hai điểm" giữa "tại" và tên).
  it('"đi qua A cắt (O) tại hai điểm B và C" → B onCircle, C secondIntersection(AB)', () => {
    const all = run('Cho (O) và điểm A nằm ngoài. Một đường thẳng d đi qua A cắt đường tròn (O) tại hai điểm B và C');
    expect(all.find((i) => i.name === 'B')?.constraint).toEqual(expect.objectContaining({ kind: 'onCircle' }));
    expect(all.find((i) => i.name === 'C')?.constraint).toEqual({ kind: 'secondIntersection', line: 'AB', circle: 'O', other: 'B' });
  });

  // "Qua điểm S vẽ đường thẳng cắt (O) tại hai điểm E, F" — chữ "điểm" sau "qua".
  it('"Qua điểm S vẽ đường thẳng cắt (O) tại hai điểm E, F" → E onCircle, F 2nd(SE)', () => {
    const all = run('Cho (O) và điểm S nằm ngoài. Qua điểm S vẽ một đường thẳng cắt đường tròn (O) tại hai điểm E, F');
    expect(all.find((i) => i.name === 'E')?.constraint).toEqual(expect.objectContaining({ kind: 'onCircle' }));
    expect(all.find((i) => i.name === 'F')?.constraint).toEqual({ kind: 'secondIntersection', line: 'SE', circle: 'O', other: 'E' });
  });

  it('"cát tuyến ADE" → A ngoài, D gần (onCircle), E xa (secondIntersection AD)', () => {
    const all = run('Cho đường tròn (O). Từ A kẻ cát tuyến ADE');
    expect(all).toContainEqual(expect.objectContaining({ op: 'add-point', name: 'D', constraint: expect.objectContaining({ kind: 'onCircle' }) }));
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'E',
      constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'D' },
    });
  });

  it('"cát tuyến ACD" → C gần, D xa', () => {
    const all = run('Cho đường tròn (O). Kẻ tiếp tuyến AB và cát tuyến ACD');
    expect(all.find((i) => i.name === 'C')?.constraint.kind).toBe('onCircle');
    expect(all.find((i) => i.name === 'D')?.constraint).toEqual({
      kind: 'secondIntersection',
      line: 'AC',
      circle: 'O',
      other: 'C',
    });
  });

  // vxhung:39 — "cát tuyến cắt đường tròn tại 2 điểm C, D" (KHÔNG token 3-chữ,
  // KHÔNG "qua X"); điểm ngoài M resolve từ "Từ điểm M ở ngoài".
  it('CAT_CUTS: "cát tuyến cắt đường tròn tại 2 điểm C và D" (ext M từ context)', () => {
    const all = run('Từ điểm M ở ngoài đường tròn (O;R) vẽ cát tuyến cắt đường tròn tại 2 điểm C và D');
    expect(all.find((i) => i.name === 'C')?.constraint).toEqual(expect.objectContaining({ kind: 'onCircle', circle: 'O' }));
    expect(all.find((i) => i.name === 'D')?.constraint).toEqual({ kind: 'secondIntersection', line: 'MC', circle: 'O', other: 'C' });
  });

  // httcd:230 — "cát tuyến d cắt đường tròn tại 2 điểm B và C" (named line "d", ext A).
  it('CAT_CUTS named-line: "cát tuyến d cắt đường tròn tại 2 điểm B và C" (ext A)', () => {
    const all = run('Cho điểm A ở ngoài đường tròn (O). Từ A kẻ cát tuyến d cắt đường tròn tại 2 điểm B và C');
    expect(all.find((i) => i.name === 'B')?.constraint.kind).toBe('onCircle');
    expect(all.find((i) => i.name === 'C')?.constraint).toEqual({ kind: 'secondIntersection', line: 'AB', circle: 'O', other: 'B' });
  });

  // julielltv:13 — "qua M cắt NỬA đường tròn tại C, D" (nửa + LINE_THROUGH).
  it('LINE_THROUGH nửa: "qua M cắt nửa đường tròn tại C, D"', () => {
    const all = run('Cho nửa đường tròn (O) và điểm M ngoài. Một cát tuyến qua M cắt nửa đường tròn tại C, D');
    expect(all.find((i) => i.name === 'C')?.constraint.kind).toBe('onCircle');
    expect(all.find((i) => i.name === 'D')?.constraint).toEqual({ kind: 'secondIntersection', line: 'MC', circle: 'O', other: 'C' });
  });
});
