// Khối đa diện lớp 12 — test ĐO toạ độ 3D (không chỉ tên): mỗi dữ kiện hình dạng của đề
// (cạnh bên ⊥ đáy, mặt bên đều ⊥ đáy, chân đường cao, lập phương, lăng trụ xiên…) phải đúng
// trên hình dựng ra. Đề lấy từ docs/datasets/hinh-khong-gian-12-bosung-2026-09.txt và các bộ 3D.
import { dung3d, dist, dot, sub, mid, goc, gan, ganV, vuongGocMat, chieuLenMat, haiMatVuong, add, mul, type V3 } from '../../__tests__/helpers/toaDo3d';
import { khoiDaDienFromProblem, isRefused } from '../khoiDaDien';

const chan = (P: Record<string, V3>, apex: string, [a, b, c]: string[]): V3 => chieuLenMat(P[apex], P[a], P[b], P[c]);

describe('khối chóp — chân đường cao đúng đề', () => {
  it('SA ⊥ (ABC), đáy vuông tại B (bộ lớp 12 kiểu Câu 1): SA ⊥ đáy + góc ABC = 90°', () => {
    const { P } = dung3d('Cho hình chóp S.ABC có đáy là tam giác vuông tại B, SA vuông góc với mặt phẳng (ABC), SA = a. Tính thể tích khối chóp S.ABC.');
    expect(vuongGocMat(P.S, P.A, P.A, P.B, P.C)).toBe(true);
    expect(gan(goc(P.A, P.B, P.C), 90)).toBe(true);
  });

  it('"khối chóp" + hai mặt phẳng (SAB),(SAC) cùng ⊥ đáy (Câu 20) → SA ⊥ đáy, đáy đều', () => {
    const { P } = dung3d('Cho khối chóp S.ABC có đáy là tam giác ABC đều cạnh a. Hai mặt phẳng (SAB) và (SAC) cùng vuông góc với đáy.');
    expect(vuongGocMat(P.S, P.A, P.A, P.B, P.C)).toBe(true);
    expect(gan(dist(P.A, P.B), dist(P.B, P.C))).toBe(true);
    expect(gan(dist(P.A, P.B), dist(P.A, P.C))).toBe(true);
  });

  it('chóp tứ giác đều có tất cả các cạnh bằng a: 8 cạnh bằng nhau, chân = tâm đáy', () => {
    const { P } = dung3d('Cho hình chóp tứ giác đều S.ABCD có tất cả các cạnh bằng a.');
    const e = dist(P.A, P.B);
    for (const [x, y] of [['B', 'C'], ['C', 'D'], ['D', 'A'], ['S', 'A'], ['S', 'B'], ['S', 'C'], ['S', 'D']]) {
      expect(gan(dist(P[x], P[y]), e)).toBe(true);
    }
    expect(ganV(chan(P, 'S', ['A', 'B', 'C']), mid(P.A, P.C))).toBe(true);
  });

  it('mặt bên SAB là tam giác đều nằm trong mp ⊥ đáy hình vuông: SAB đều + (SAB) ⊥ (ABCD)', () => {
    const { P } = dung3d('Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh 1. Tam giác SAB đều và nằm trong mặt phẳng vuông góc với đáy (ABCD).');
    expect(gan(dist(P.S, P.A), dist(P.A, P.B))).toBe(true);
    expect(gan(dist(P.S, P.B), dist(P.A, P.B))).toBe(true);
    expect(haiMatVuong([P.S, P.A, P.B], [P.A, P.B, P.C])).toBe(true);
    expect(gan(goc(P.A, P.B, P.C), 90)).toBe(true);
  });

  it('tam giác SAD vuông cân tại S nằm trong mp ⊥ đáy → góc ASD = 90°, SA = SD', () => {
    const { P } = dung3d('Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật. Tam giác SAD vuông cân tại S và nằm trong mặt phẳng vuông góc với đáy.');
    expect(gan(goc(P.A, P.S, P.D), 90)).toBe(true);
    expect(gan(dist(P.S, P.A), dist(P.S, P.D))).toBe(true);
    expect(haiMatVuong([P.S, P.A, P.D], [P.A, P.B, P.C])).toBe(true);
  });

  it('(SAB) ⊥ đáy + tam giác SAB vuông tại A → SA ⊥ đáy', () => {
    const { P } = dung3d('Cho hình chóp S.ABCD có đáy là hình vuông, mặt phẳng (SAB) vuông góc với đáy, tam giác SAB vuông tại A.');
    expect(vuongGocMat(P.S, P.A, P.A, P.B, P.C)).toBe(true);
  });

  it('hình chiếu của S là trung điểm của AC, đáy vuông tại B (Câu 3)', () => {
    const { P } = dung3d('Cho hình chóp S.ABC có đáy là tam giác vuông tại B có AB = a, BC = a√3. Hình chiếu của đỉnh S trên mặt phẳng đáy trùng với trung điểm của cạnh AC.');
    expect(ganV(chan(P, 'S', ['A', 'B', 'C']), mid(P.A, P.C))).toBe(true);
    expect(gan(goc(P.A, P.B, P.C), 90)).toBe(true);
  });

  it('hình chiếu của S là trung điểm của OA (O tâm hình vuông)', () => {
    const { P } = dung3d('Cho hình chóp S.ABCD có đáy ABCD là hình vuông tâm O cạnh a, hình chiếu của đỉnh S trên mặt phẳng đáy trùng với trung điểm của cạnh OA.');
    const O = mid(P.A, P.C);
    expect(ganV(chan(P, 'S', ['A', 'B', 'C']), mid(O, P.A))).toBe(true);
  });

  it('hình chiếu của S là điểm H thuộc cạnh AB sao cho HA = 2HB → HA = 2·HB trên hình', () => {
    const { P } = dung3d('Cho hình chóp S.ABC có đáy là tam giác đều cạnh bằng 4. Hình chiếu của S lên (ABC) là điểm H thuộc cạnh AB sao cho HA = 2HB.');
    const H = chan(P, 'S', ['A', 'B', 'C']);
    expect(gan(dist(H, P.A), 2 * dist(H, P.B))).toBe(true);
    expect(gan(dist(H, P.A) + dist(H, P.B), dist(P.A, P.B))).toBe(true); // H ∈ đoạn AB
    expect(ganV(P.H, H)).toBe(true);                                      // điểm H vẽ ra = chân đường cao
  });

  it('SO ⊥ đáy, O tâm hình thoi góc BAD = 60°: góc BAD = 60° + S trên tâm', () => {
    const { P } = dung3d('Cho hình chóp S.ABCD có đáy ABCD là hình thoi tâm O, cạnh a, góc BAD = 60°, có SO vuông góc với mặt đáy và SO = a.');
    expect(gan(goc(P.B, P.A, P.D), 60)).toBe(true);
    expect(gan(dist(P.A, P.B), dist(P.B, P.C))).toBe(true);
    expect(ganV(P.O, mid(P.A, P.C))).toBe(true);
    expect(vuongGocMat(P.S, P.O, P.A, P.B, P.C)).toBe(true);
  });

  it('SA = SB = SD trên hình thoi BAD = 60° → S cách đều A, B, D', () => {
    const { P } = dung3d('Cho hình chóp S.ABCD có đáy là hình thoi cạnh a, SA = SB = SD = a, BAD = 60°.');
    expect(gan(dist(P.S, P.A), dist(P.S, P.B))).toBe(true);
    expect(gan(dist(P.S, P.A), dist(P.S, P.D))).toBe(true);
  });

  it('các mặt bên cùng tạo với đáy một góc (Câu 30) → chân cách đều 3 cạnh đáy (tâm nội tiếp)', () => {
    const { P } = dung3d('Cho hình chóp tam giác S.ABC có AB = 5a, BC = 6a, CA = 7a. Các mặt bên (SAB), (SBC), (SCA) tạo với đáy một góc 60°.');
    const H = chan(P, 'S', ['A', 'B', 'C']);
    const dLine = (p: V3, a: V3, b: V3) => {
      const ab = sub(b, a), t = dot(sub(p, a), ab) / dot(ab, ab);
      return dist(p, add(a, mul(ab, t)));
    };
    const d1 = dLine(H, P.A, P.B), d2 = dLine(H, P.B, P.C), d3 = dLine(H, P.C, P.A);
    expect(gan(d1, d2)).toBe(true);
    expect(gan(d1, d3)).toBe(true);
  });

  it('đáy hình thang vuông tại A và B, SA ⊥ đáy: góc DAB = góc ABC = 90°', () => {
    const { P } = dung3d('Cho hình chóp S.ABCD có đáy là hình thang vuông tại A và B, BA = BC = a, AD = 2a. Cạnh bên SA vuông góc với đáy và SA = a√2.');
    expect(gan(goc(P.D, P.A, P.B), 90)).toBe(true);
    expect(gan(goc(P.A, P.B, P.C), 90)).toBe(true);
    expect(Math.abs(dot(sub(P.D, P.A), sub(P.C, P.B)) - dist(P.A, P.D) * dist(P.B, P.C)) < 1e-6).toBe(true); // AD ∥ BC
    expect(vuongGocMat(P.S, P.A, P.A, P.B, P.C)).toBe(true);
  });

  it('đáy nửa lục giác đều AD = 2a: AB = BC = CD = AD/2, bốn đỉnh cùng nằm trên đường tròn đường kính AD', () => {
    const { P } = dung3d('Cho hình chóp S.ABCD có đáy ABCD là nửa lục giác đều cạnh a, AD = 2a, SA ⊥ (ABCD).');
    const s = dist(P.A, P.B);
    expect(gan(dist(P.B, P.C), s)).toBe(true);
    expect(gan(dist(P.C, P.D), s)).toBe(true);
    expect(gan(dist(P.A, P.D), 2 * s)).toBe(true);
    const O = mid(P.A, P.D);
    expect(gan(dist(O, P.B), s)).toBe(true);
    expect(gan(dist(O, P.C), s)).toBe(true);
  });

  it('tứ diện OABC có OA, OB, OC đôi một vuông góc', () => {
    const { P } = dung3d('Cho tứ diện OABC có OA, OB, OC đôi một vuông góc và OA = a, OB = 2a, OC = 3a.');
    expect(Math.abs(dot(sub(P.A, P.O), sub(P.B, P.O)))).toBeLessThan(1e-9);
    expect(Math.abs(dot(sub(P.A, P.O), sub(P.C, P.O)))).toBeLessThan(1e-9);
    expect(Math.abs(dot(sub(P.B, P.O), sub(P.C, P.O)))).toBeLessThan(1e-9);
  });

  it('tứ diện đều: 6 cạnh bằng nhau', () => {
    const { P } = dung3d('Cho tứ diện đều ABCD có cạnh bằng a.');
    const e = dist(P.A, P.B);
    for (const [x, y] of [['A', 'C'], ['A', 'D'], ['B', 'C'], ['B', 'D'], ['C', 'D']]) expect(gan(dist(P[x], P[y]), e)).toBe(true);
  });

  it('tứ diện có (ABC) ⊥ (BCD), tam giác ABC đều → hai mặt vuông góc + ABC đều', () => {
    const { P } = dung3d('Cho tứ diện ABCD có hai mặt phẳng (ABC) và (BCD) vuông góc với nhau. Biết tam giác ABC đều cạnh a, tam giác BCD vuông cân tại D.');
    expect(haiMatVuong([P.A, P.B, P.C], [P.B, P.C, P.D])).toBe(true);
    expect(gan(dist(P.A, P.B), dist(P.B, P.C))).toBe(true);
    expect(gan(dist(P.A, P.C), dist(P.B, P.C))).toBe(true);
    expect(gan(goc(P.B, P.D, P.C), 90)).toBe(true);
    expect(gan(dist(P.D, P.B), dist(P.D, P.C))).toBe(true);
  });
});

describe('lăng trụ / hộp / lập phương', () => {
  it('lập phương ABCD.A\'B\'C\'D\': 12 cạnh bằng nhau, các góc vuông', () => {
    const { P } = dung3d("Cho hình lập phương ABCD.A'B'C'D' có cạnh bằng a.");
    const e = dist(P.A, P.B);
    const edges = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ["A'", "B'"], ["B'", "C'"], ["C'", "D'"], ["D'", "A'"], ['A', "A'"], ['B', "B'"], ['C', "C'"], ['D', "D'"]];
    for (const [x, y] of edges) expect(gan(dist(P[x], P[y]), e)).toBe(true);
    expect(gan(goc(P.B, P.A, P.D), 90)).toBe(true);
    expect(vuongGocMat(P.A, P["A'"], P.A, P.B, P.C)).toBe(true);
  });

  it('lăng trụ đứng, đáy vuông cân tại A: AA\' ⊥ đáy, góc BAC = 90°, AB = AC', () => {
    const { P } = dung3d("Cho hình lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác vuông cân tại A, AB = a. Biết góc giữa hai mặt phẳng (A'BC) và (ABC) bằng 30°.");
    expect(vuongGocMat(P.A, P["A'"], P.A, P.B, P.C)).toBe(true);
    expect(gan(goc(P.B, P.A, P.C), 90)).toBe(true);
    expect(gan(dist(P.A, P.B), dist(P.A, P.C))).toBe(true);
  });

  it('lăng trụ đứng có tất cả các cạnh bằng a → đáy đều, cạnh bên = cạnh đáy', () => {
    const { P } = dung3d("Cho hình lăng trụ đứng ABC.A'B'C' có tất cả các cạnh đều bằng a.");
    const e = dist(P.A, P.B);
    expect(gan(dist(P.B, P.C), e)).toBe(true);
    expect(gan(dist(P.A, P["A'"]), e)).toBe(true);
    expect(vuongGocMat(P.A, P["A'"], P.A, P.B, P.C)).toBe(true);
  });

  it('lăng trụ xiên: hình chiếu của A\' lên (ABC) là trung điểm BC; cạnh bên song song, bằng nhau', () => {
    const { P } = dung3d("Cho hình lăng trụ ABC.A'B'C' có đáy ABC là tam giác đều cạnh a. Hình chiếu vuông góc của A' lên (ABC) trùng với trung điểm của BC.");
    expect(ganV(chieuLenMat(P["A'"], P.A, P.B, P.C), mid(P.B, P.C))).toBe(true);
    expect(ganV(sub(P["A'"], P.A), sub(P["B'"], P.B))).toBe(true);
    expect(ganV(sub(P["A'"], P.A), sub(P["C'"], P.C))).toBe(true);
  });

  it("lăng trụ có A'A = A'B = A'C → A' cách đều A, B, C", () => {
    const { P } = dung3d("Cho hình lăng trụ ABC.A'B'C' có đáy là tam giác vuông tại A, A'A = A'B = A'C.");
    expect(gan(dist(P["A'"], P.A), dist(P["A'"], P.B))).toBe(true);
    expect(gan(dist(P["A'"], P.A), dist(P["A'"], P.C))).toBe(true);
    expect(gan(goc(P.B, P.A, P.C), 90)).toBe(true);
  });
});

describe('thà thiếu còn hơn sai — dữ kiện chưa hiểu thì TỪ CHỐI', () => {
  const refused = (de: string) => {
    const k = khoiDaDienFromProblem(de);
    return !!k && isRefused(k);
  };
  it('cạnh-cạnh vuông góc chưa dựng (BC ⊥ DB) → từ chối', () => {
    expect(refused('Hình chóp D.ABC có DA vuông góc với (ABC), BC vuông góc với DB.')).toBe(true);
  });
  it('hai mặt phẳng (SBD), (SAM) cùng ⊥ đáy (giao tuyến không qua đỉnh đáy) → từ chối', () => {
    expect(refused('Cho hình chóp S.ABCD có đáy ABCD là hình bình hành. Gọi M là trung điểm của CD, hai mặt phẳng (SBD) và (SAM) cùng vuông góc với đáy.')).toBe(true);
  });
  it('chóp đều nhưng đáy vuông tại B → mâu thuẫn → từ chối', () => {
    expect(refused('Cho hình chóp tam giác đều S.ABC có đáy là tam giác vuông tại B.')).toBe(true);
  });
  it('đáy lục giác (layout chưa có) → từ chối', () => {
    expect(refused('Cho hình chóp S.ABCD có đáy là lục giác đều cạnh a. Tam giác SAD vuông cân tại S.')).toBe(true);
  });
  it('mặt bên SAB ⊥ đáy nhưng hình dạng tam giác SAB đọc không ra → từ chối', () => {
    expect(refused('Cho hình chóp S.ABCD có đáy là hình thoi, tam giác SAB 2 vuông tại S và mặt phẳng (SAB) vuông góc với mặt phẳng (ABCD).')).toBe(true);
  });
  it('hình chiếu của S là tâm đường tròn ngoại tiếp tam giác thường → từ chối', () => {
    expect(refused('Cho hình chóp S.ABC có đáy là tam giác vuông tại A. Hình chiếu của S lên (ABC) là tâm đường tròn ngoại tiếp tam giác ABC.')).toBe(true);
  });
  it('từ chối ⟹ cả pipeline KHÔNG ra hình (trước đây vẽ đỉnh trên tâm đáy — sai)', () => {
    const { tryDeterministicFigure3d } = jest.requireActual('../../deterministic/tryDeterministicFigure3d');
    const r = tryDeterministicFigure3d('Cho hình chóp S.ABCD có đáy ABCD là hình bình hành. Gọi M là trung điểm của CD, hai mặt phẳng (SBD) và (SAM) cùng vuông góc với đáy.');
    expect(r.ok).toBe(false);
  });
});

describe('chuẩn hoá đề 3D', () => {
  it("nhãn A′/A’ và ngoặc font Symbol (\\uf028/\\uf029) → cùng hình với bản gõ chuẩn", () => {
    const a = dung3d("Cho hình lăng trụ đứng ABC.A′B′C′ có đáy ABC là tam giác vuông tại A.").P;
    const b = dung3d("Cho hình lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác vuông tại A.").P;
    expect(ganV(a["A'"], b["A'"])).toBe(true);
    const { P } = dung3d('Cho hình chóp S.ABCD có SA vuông góc với mặt phẳng \uf028ABCD\uf029, ABCD là hình chữ nhật.');
    expect(vuongGocMat(P.S, P.A, P.A, P.B, P.C)).toBe(true);
  });
});
