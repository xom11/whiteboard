import { onCirclePointRule } from '../onCirclePoint';
import { segmentClauses } from '../../deterministic/coverage';
import { normalizeProblemText } from '../../deterministic/normalizeText';

function intents(problem: string) {
  return onCirclePointRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

// Như pipeline thật: normalize + chỉ feed clause hasGeometry vào rule. Dùng cho
// các phrasing mới (di chuyển/thay đổi/Gọi … thuộc cung) để bám sát runRules.
function ctxOf(text: string) {
  const problem = normalizeProblemText(text);
  const clauses = segmentClauses(problem).filter((c) => c.hasGeometry);
  return { problem, clauses };
}
function geoIntents(text: string) {
  return onCirclePointRule.match(ctxOf(text)).flatMap((m) => m.intents as any[]);
}

describe('onCirclePointRule', () => {
  it('"Điểm M nằm trên nửa đường tròn" after diameter circle → M on O_c', () => {
    const all = intents('Cho nửa đường tròn (O) đường kính AB. Điểm M nằm trên nửa đường tròn');
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'M',
      constraint: { kind: 'onCircle', circle: 'O_c', theta: 1.2 },
    });
  });

  it('"Lấy điểm F thuộc cung AC nhỏ" → F on O_c when diameter circle is unique', () => {
    const all = intents('Cho (O;R) đường kính AB. Lấy điểm F thuộc cung AC nhỏ');
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'F',
      constraint: { kind: 'onCircle', circle: 'O_c', theta: 1.2 },
    });
  });

  it('"Lấy điểm C thuộc (O)" bare paren → C on circle', () => {
    const all = intents('Cho đường tròn (O) đường kính AB. Lấy điểm C thuộc (O)');
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'C',
      constraint: { kind: 'onCircle', circle: 'O_c', theta: 1.2 },
    });
  });

  it('"lấy hai điểm C và D thuộc nửa đường tròn" → C, D on O_c với theta KHÁC nhau (Bài 9)', () => {
    const all = intents(
      'Cho nửa đường tròn (O; R) đường kính AB. Kẻ tiếp tuyến Bx và lấy hai điểm C và D thuộc nửa đường tròn.',
    );
    const c = all.find((i) => i.name === 'C');
    const d = all.find((i) => i.name === 'D');
    expect(c).toBeDefined();
    expect(d).toBeDefined();
    expect(c.constraint.kind).toBe('onCircle');
    expect(c.constraint.circle).toBe('O_c');
    expect(d.constraint.kind).toBe('onCircle');
    expect(d.constraint.circle).toBe('O_c');
    expect(c.constraint.theta).not.toBe(d.constraint.theta);
  });

  // hinh9:19 / vao10:202 — ĐẢO 2 điểm trên cung: "Trên cung lớn AB lấy hai điểm C, D".
  it('"Trên cung lớn AB lấy hai điểm C, D" → C, D onCircle theta khác nhau', () => {
    const all = intents('Cho đường tròn (O) đường kính AB. Trên cung lớn AB lấy hai điểm C, D sao cho AD // BC.');
    const c = all.find((i) => i.name === 'C');
    const d = all.find((i) => i.name === 'D');
    expect(c?.constraint.kind).toBe('onCircle');
    expect(d?.constraint.kind).toBe('onCircle');
    expect(c.constraint.circle).toBe('O_c');
    expect(c.constraint.theta).not.toBe(d.constraint.theta);
  });

  it('"Trên cung nhỏ AB lấy hai điểm C và E" → C, E onCircle', () => {
    const all = intents('Cho đường tròn (O). Trên cung nhỏ AB lấy hai điểm C và E.');
    expect(all.find((i) => i.name === 'C')?.constraint.kind).toBe('onCircle');
    expect(all.find((i) => i.name === 'E')?.constraint.kind).toBe('onCircle');
  });

  it('không có circle rõ ràng → không claim', () => {
    expect(intents('Lấy điểm F thuộc cung AC nhỏ')).toEqual([]);
  });

  it('Bài 21: "Trên đường tròn (I) lấy điểm P bất kỳ" → P trên CHÍNH (I), không phải (O) toàn đề', () => {
    // Đề có (O) đường kính AB TRƯỚC, nhưng P phải thuộc (I). Emit center thô "I"
    // (resolveCircleNames map sang I_c nếu I là điểm). KHÔNG được lấy circle (O).
    const all = intents(
      'Cho đường tròn (O) đường kính AB. Vẽ đường tròn tâm I đi qua A. Trên đường tròn (I) lấy điểm P bất kỳ.',
    );
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'P', constraint: expect.objectContaining({ kind: 'onCircle', circle: 'I' }) }),
    );
    // KHÔNG có intent đặt P trên O_c.
    expect(all.find((i) => i.name === 'P' && i.constraint.circle === 'O_c')).toBeUndefined();
  });

  it('"Các điểm E, F thuộc cung BC" (phân phối phẩy) → E,F onCircle (Câu 28)', () => {
    const all = intents('Cho tam giác ABC nội tiếp (O). Các điểm E, F thuộc cung BC không chứa A');
    const names = all.filter((i) => i.constraint?.kind === 'onCircle').map((i) => i.name).sort();
    expect(names).toEqual(['E', 'F']);
  });

  it('bare "(O)" (không tiền tố "đường tròn") vẫn resolve circle', () => {
    const all = intents('Cho tam giác ABC nội tiếp (O). Điểm M thuộc cung nhỏ BC');
    expect(all.find((i) => i.name === 'M' && i.constraint?.kind === 'onCircle')).toBeDefined();
  });

  it('"M, N là hai điểm thuộc cung nhỏ BC" (tên trước) → M,N onCircle (Câu 18)', () => {
    const all = intents('Cho tam giác ABC nội tiếp (O). M, N là hai điểm thuộc cung nhỏ BC');
    const names = all.filter((i) => i.constraint?.kind === 'onCircle').map((i) => i.name).sort();
    expect(names).toEqual(['M', 'N']);
  });
});

// Các phrasing "điểm chạy trên cung" / "Gọi … là điểm … thuộc cung" — feed qua
// ctxOf (normalize + lọc hasGeometry) để bám sát pipeline runRules.
describe('onCirclePointRule — điểm tự do trên cung (di chuyển / thay đổi / thuộc)', () => {
  it('hinh9 #108: "Gọi E là một điểm bất kì thuộc cung nhỏ BC của (O)" → E onCircle (O)', () => {
    const all = geoIntents(
      'Cho tam giác ABC nhọn, AB < AC, nội tiếp đường tròn (O). Gọi E là một điểm bất kì thuộc cung nhỏ BC của đường tròn (O) sao cho BE < BA.',
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'E',
        constraint: expect.objectContaining({ kind: 'onCircle', circle: 'O' }),
      }),
    );
  });

  it('hinh9 #116: "điểm A thay đổi trên cung lớn BC" → A onCircle (O)', () => {
    const all = geoIntents(
      'Cho đường tròn (O), dây cung BC không chứa tâm O và điểm A thay đổi trên cung lớn BC.',
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'A',
        constraint: expect.objectContaining({ kind: 'onCircle', circle: 'O' }),
      }),
    );
  });

  it('hinh9 #126: "Điểm P di chuyển trên cung nhỏ AD" → P onCircle (O) [rule-level]', () => {
    // onCirclePoint CLAIM được clause này (regex POINT_ON khớp "P di chuyển trên
    // cung nhỏ AD"). Dùng segmentClauses TRẦN (như các test khác trong file) để
    // kiểm tra phần rule chịu trách nhiệm.
    //
    // GOTCHA pipeline (ngoài phạm vi rule này): trong runDeterministicIntents,
    // clause "(Điểm)? P di chuyển trên cung …" bị coverage.ts đánh dấu
    // hasGeometry=false (LOCUS_CLAUSE: "di chuyển trên cung" = locus điểm-trên-
    // đường-tròn) → KHÔNG được feed vào runRules → P không dựng → transpile-fail
    // (PB/PC ref P). Để #126 chạy end-to-end cần nới LOCUS_CLAUSE/locusOnly trong
    // coverage.ts (file đó nằm ngoài phạm vi thay đổi của task này).
    const all = intents(
      'Cho hình vuông ABCD nội tiếp đường tròn (O). Điểm P di chuyển trên cung nhỏ AD.',
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'P',
        constraint: expect.objectContaining({ kind: 'onCircle', circle: 'O' }),
      }),
    );
  });

  // GUARD chống regress (shared rule): onCirclePoint KHÔNG được claim điểm trên
  // CẠNH/đoạn — đó là việc của onSegmentPoint. Hậu tố ON_SUFFIX neo circle/cung,
  // "cạnh AC" không khớp → không emit.
  it('GUARD: "Trên cạnh AC lấy điểm M" KHÔNG bị onCirclePoint claim (thuộc onSegmentPoint)', () => {
    const all = geoIntents('Cho tam giác ABC nội tiếp đường tròn (O). Trên cạnh AC lấy điểm M.');
    expect(all.find((i) => i.name === 'M')).toBeUndefined();
  });

  it('GUARD: "Điểm E thuộc cạnh BC" KHÔNG bị onCirclePoint claim', () => {
    const all = geoIntents('Cho tam giác ABC nội tiếp đường tròn (O). Điểm E thuộc cạnh BC.');
    expect(all.find((i) => i.name === 'E')).toBeUndefined();
  });
});
