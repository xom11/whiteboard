/** @jest-environment jsdom */
// Đề thật trong docs/datasets/lop7-2026-09.txt — đo hình dựng bằng JSXGraph thật:
// điểm nằm TRONG đoạn, vuông góc, độ dài, và các kết luận đề bắt chứng minh (hình
// đúng thì kết luận đúng trên toạ độ).
import { toaDoHinh, dist, thuocDoan, type XY } from './helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const cheo = (a: XY, b: XY, p: XY) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const thangHang = (p: XY, a: XY, b: XY) => Math.abs(cheo(a, b, p)) < 1e-9;
const dot = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
const songSong = (a: XY, b: XY, c: XY, d: XY) =>
  Math.abs((b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])) < 1e-9;
const kc = (p: XY, a: XY, b: XY) => Math.abs(cheo(a, b, p)) / dist(a, b);

describe('lop7-2026-09 — hình đúng điều kiện đề', () => {
  it('#16 ý b) "Tia ED cắt tia AH tại K" (mở đầu bằng giao điểm) được dựng; tam giác KCD cân tại D; A, D, I thẳng hàng', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A (AB < AC), H là chân đường vuông góc hạ từ A xuống BC. Trên cạnh AC, lấy điểm E sao cho AH = AE. Qua E kẻ đường vuông góc với AC, cắt cạnh BC tại D.\na) Chứng minh tam giác AHD = tam giác AED và AD là tia phân giác của góc HAC.\nb) Tia ED cắt tia AH tại K. Chứng minh tam giác KCD cân.\nc) Gọi I là trung điểm của KC. Chứng minh ba điểm A, D, I thẳng hàng.');
    expect(thangHang(p.K, p.E, p.D)).toBe(true);
    expect(thangHang(p.K, p.A, p.H)).toBe(true);
    expect(dist(p.D, p.K)).toBeCloseTo(dist(p.D, p.C), 9);
    expect(thangHang(p.I, p.A, p.D)).toBe(true);
  });

  it('#38 "Gọi M là điểm tùy ý trên đoạn thẳng AH": M trong đoạn AH', () => {
    const p = toaDoHinh('Cho tam giác ABC (AB < AC), đường cao AH. Gọi M là điểm tùy ý trên đoạn thẳng AH. Chứng minh MB < MC.');
    expect(thuocDoan(p.M, p.A, p.H)).toBe(true);
    expect(dist(p.M, p.A)).toBeGreaterThan(1e-3);
    expect(dist(p.M, p.H)).toBeGreaterThan(1e-3);
  });

  it('#41 "H, K lần lượt là chân các đường vuông góc kẻ từ B, C xuống đoạn thẳng AD": BH ⊥ AD, CK ⊥ AD; BH + CK < BC', () => {
    const p = toaDoHinh('Cho tam giác ABC, D là điểm nằm giữa B và C (AD không vuông góc với BC). Gọi H, K lần lượt là chân các đường vuông góc kẻ từ B, C xuống đoạn thẳng AD.');
    expect(thangHang(p.H, p.A, p.D)).toBe(true);
    expect(thangHang(p.K, p.A, p.D)).toBe(true);
    expect(dot(p.B, p.H, p.A, p.D)).toBeCloseTo(0, 9);
    expect(dot(p.C, p.K, p.A, p.D)).toBeCloseTo(0, 9);
    expect(dist(p.B, p.H) + dist(p.C, p.K)).toBeLessThan(dist(p.B, p.C));
  });

  it('#50 "I là điểm đồng quy của ba đường phân giác trong tam giác ABC": cách đều 3 cạnh', () => {
    const p = toaDoHinh('Kí hiệu I là điểm đồng quy của ba đường phân giác trong tam giác ABC. Tính góc BIC khi biết góc BAC bằng 120°.');
    expect(kc(p.I, p.A, p.B)).toBeCloseTo(kc(p.I, p.B, p.C), 9);
    expect(kc(p.I, p.A, p.C)).toBeCloseTo(kc(p.I, p.B, p.C), 9);
  });

  it('#60 "Trên cạnh BC lấy hai điểm D và E sao cho BD = BA và CE = CA": D, E trong BC, đúng độ dài', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A. Trên cạnh BC lấy hai điểm D và E sao cho BD = BA và CE = CA. Chứng minh tâm O của đường tròn ngoại tiếp tam giác ADE là giao điểm của các đường phân giác của tam giác ABC.');
    expect(thuocDoan(p.D, p.B, p.C)).toBe(true);
    expect(thuocDoan(p.E, p.B, p.C)).toBe(true);
    expect(dist(p.B, p.D)).toBeCloseTo(dist(p.B, p.A), 9);
    expect(dist(p.C, p.E)).toBeCloseTo(dist(p.C, p.A), 9);
  });

  it('#14 "Đường thẳng qua A song song với BC cắt đường thẳng qua C song song với AB ở D": AD // BC, CD // AB; M trung điểm AC', () => {
    const p = toaDoHinh('Cho tam giác ABC. Đường thẳng qua A song song với BC cắt đường thẳng qua C song song với AB ở D. Gọi M là giao điểm của BD và AC.');
    expect(songSong(p.A, p.D, p.B, p.C)).toBe(true);
    expect(songSong(p.C, p.D, p.A, p.B)).toBe(true);
    expect(dist(p.A, p.M)).toBeCloseTo(dist(p.M, p.C), 9);
  });

  it('#48 "Qua D kẻ đường thẳng // AB, qua B kẻ đường thẳng // AD, hai đường thẳng này cắt nhau tại E": DE // AB, BE // AD; D trọng tâm ACE', () => {
    const p = toaDoHinh('Cho tam giác ABC, đường trung tuyến AD. Qua D kẻ đường thẳng song song với AB, qua B kẻ đường thẳng song song với AD, hai đường thẳng này cắt nhau tại E.\nd) Gọi K là trung điểm CE. Chứng minh A, D, K thẳng hàng.');
    expect(songSong(p.D, p.E, p.A, p.B)).toBe(true);
    expect(songSong(p.B, p.E, p.A, p.D)).toBe(true);
    expect(thangHang(p.K, p.A, p.D)).toBe(true);
    expect(dist(p.A, p.D) / dist(p.A, p.K)).toBeCloseTo(2 / 3, 9);
  });

  const goc = (a: XY, o: XY, b: XY) => {
    const u = [a[0] - o[0], a[1] - o[1]];
    const v = [b[0] - o[0], b[1] - o[1]];
    return (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))) * 180) / Math.PI;
  };

  it('#17 "góc A = 90°; góc B = 60°" (không chữ "vuông"): góc đúng số đo; D trên CẠNH BC với BD = AB', () => {
    const p = toaDoHinh('Cho tam giác ABC có góc A = 90°; góc B = 60°. Trên cạnh BC lấy điểm D sao cho BD = AB. Đường vuông góc với BC tại D cắt AC ở E.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(90, 9);
    expect(goc(p.A, p.B, p.C)).toBeCloseTo(60, 9);
    expect(thuocDoan(p.D, p.B, p.C)).toBe(true);
    expect(dist(p.B, p.D)).toBeCloseTo(dist(p.A, p.B), 9);
  });

  it('#32 "vuông tại C có góc A = 60°" và #59 "cân tại A, có góc A = 50°": số đo góc đúng', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại C có góc A = 60°. Trên cạnh AB lấy điểm K sao cho AK = AC.');
    expect(goc(p.A, p.C, p.B)).toBeCloseTo(90, 9);
    expect(goc(p.C, p.A, p.B)).toBeCloseTo(60, 9);
    const q = toaDoHinh('Cho tam giác ABC cân tại A, có góc A = 50°. Đường trung trực của AB cắt BC ở D.');
    expect(goc(q.B, q.A, q.C)).toBeCloseTo(50, 9);
    expect(dist(q.A, q.B)).toBeCloseTo(dist(q.A, q.C), 9);
  });

  it('#33 "góc BAC là góc tù": góc A > 90°', () => {
    const p = toaDoHinh('Cho tam giác ABC có góc BAC là góc tù. Lấy điểm D nằm giữa A và B, lấy điểm E nằm giữa A và C. Chứng minh DE < BC.');
    expect(goc(p.B, p.A, p.C)).toBeGreaterThan(90);
  });

  it('#54 "AB < AC" được tôn trọng ⇒ E (AE = AB) nằm TRONG cạnh AC', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB < AC. Kẻ tia phân giác AD của góc BAC (D ∈ BC). Trên cạnh AC lấy điểm E sao cho AE = AB, trên tia AB lấy điểm F sao cho AF = AC.');
    expect(dist(p.A, p.B)).toBeLessThan(dist(p.A, p.C));
    expect(thuocDoan(p.E, p.A, p.C)).toBe(true);
  });

  it('#55 "vuông tại A có AB = AC/2": tỉ số cạnh đúng; B là trung điểm AK', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A có AB = AC/2, AD là tia phân giác góc BAC (D ∈ BC). Gọi E là trung điểm của AC.\nb) AB cắt DE tại K. Chứng minh rằng tam giác DCK cân và B là trung điểm của đoạn thẳng AK.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(90, 9);
    expect(dist(p.A, p.C)).toBeCloseTo(2 * dist(p.A, p.B), 9);
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.B, p.K), 9);
  });

  it('#25 "hình chiếu vuông góc của H trên cạnh AB, AC": đỉnh C KHÔNG bị kéo lên AB; M, N là chân vuông góc', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A, đường cao AH. Lấy điểm M, N lần lượt là hình chiếu vuông góc của H trên cạnh AB, AC. Đường thẳng qua H và song song với AC cắt cạnh AB ở D.');
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.A, p.C), 9);
    expect(dist(p.C, p.A)).toBeGreaterThan(1);
    expect(dot(p.H, p.M, p.A, p.B)).toBeCloseTo(0, 9);
    expect(dot(p.H, p.N, p.A, p.C)).toBeCloseTo(0, 9);
    expect(dist(p.D, p.H)).toBeCloseTo(dist(p.A, p.B) / 2, 9);
  });

  it('#61 "các đường trung trực của các đoạn thẳng BE và CA cắt nhau ở I": IB = IE, IC = IA (không phải I = BE ∩ CA)', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB < AC, lấy E trên cạnh CA sao cho CE = BA, các đường trung trực của các đoạn thẳng BE và CA cắt nhau ở I.');
    expect(thuocDoan(p.E, p.C, p.A)).toBe(true);
    expect(dist(p.I, p.B)).toBeCloseTo(dist(p.I, p.E), 9);
    expect(dist(p.I, p.C)).toBeCloseTo(dist(p.I, p.A), 9);
    // kết luận b): AI là phân giác góc BAC
    expect(goc(p.B, p.A, p.I)).toBeCloseTo(goc(p.I, p.A, p.C), 6);
  });

  it('#7 "Trên nửa mặt phẳng bờ AC không chứa B vẽ tam giác ACD sao cho AD = BC; CD = AB": đúng độ dài, khác phía B', () => {
    const p = toaDoHinh('Cho tam giác ABC, đường cao AH. Trên nửa mặt phẳng bờ AC không chứa B vẽ tam giác ACD sao cho AD = BC; CD = AB. Chứng minh rằng: AB // CD và AH ⊥ AD.');
    expect(dist(p.A, p.D)).toBeCloseTo(dist(p.B, p.C), 9);
    expect(dist(p.C, p.D)).toBeCloseTo(dist(p.A, p.B), 9);
    expect(cheo(p.A, p.C, p.B) * cheo(p.A, p.C, p.D)).toBeLessThan(0);
    expect(dot(p.A, p.H, p.A, p.D)).toBeCloseTo(0, 9);
  });

  it('#68 "hai tam giác nhọn ABC và ECD": đỉnh E KHÔNG trùng A; B, C, D thẳng hàng', () => {
    const p = toaDoHinh('Cho hai tam giác nhọn ABC và ECD, trong đó ba điểm B, C, D thẳng hàng. Hai đường cao BM và CN của tam giác ABC cắt nhau tại I, hai đường cao CP và DQ của tam giác ECD cắt nhau tại K. Chứng minh AI // EK.');
    expect(dist(p.E, p.A)).toBeGreaterThan(0.5);
    expect(thangHang(p.C, p.B, p.D)).toBe(true);
    // đúng kết luận: AI // EK
    expect(songSong(p.A, p.I, p.E, p.K)).toBe(true);
  });

  it('#43 "AI và AM lần lượt là đường cao và đường trung tuyến": I chân đường cao, M trung điểm BC', () => {
    const p = toaDoHinh('Gọi AI và AM lần lượt là đường cao và đường trung tuyến xuất phát từ đỉnh A của tam giác ABC. Chứng minh rằng a) AI < (AB + AC)/2');
    expect(dot(p.A, p.I, p.B, p.C)).toBeCloseTo(0, 9);
    expect(thangHang(p.I, p.B, p.C)).toBe(true);
    expect(dist(p.B, p.M)).toBeCloseTo(dist(p.M, p.C), 9);
  });

  it('#26 "AB = AC, AB > BC" (không chữ "cân") ⇒ cân tại A, cạnh bên > đáy; ý b), c) mở đầu bằng "Tia…/Đường thẳng… cắt" được dựng', () => {
    const p = toaDoHinh('Cho tam giác ABC, AB = AC, AB > BC, H là trung điểm của BC.\na) Chứng minh tam giác ABH = tam giác ACH. Từ đó suy ra AH vuông góc với BC.\nb) Tia phân giác của góc B cắt AH tại I. Chứng minh tam giác BIC cân.\nc) Đường thẳng đi qua A và song song với BC cắt BI, CI lần lượt tại M, N. Chứng minh A là trung điểm của đoạn MN.\nd) Kẻ IE vuông góc với AB tại E, IF vuông góc với AC tại F. Chứng minh: IH = IE = IF.\ne) Chứng minh IC vuông góc với MC.');
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.A, p.C), 9);
    expect(dist(p.A, p.B)).toBeGreaterThan(dist(p.B, p.C));
    expect(thangHang(p.I, p.A, p.H)).toBe(true);
    expect(goc(p.A, p.B, p.I)).toBeCloseTo(goc(p.I, p.B, p.C), 9);
    expect(dist(p.A, p.M)).toBeCloseTo(dist(p.A, p.N), 9);
    expect(dist(p.I, p.H)).toBeCloseTo(dist(p.I, p.E), 9);
    expect(dot(p.C, p.I, p.C, p.M)).toBeCloseTo(0, 9);
  });

  it('"vuông tại A và AB = AC" ⇒ vuông cân', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A và AB = AC. Gọi M là trung điểm của BC.');
    expect(goc(p.B, p.A, p.C)).toBeCloseTo(90, 9);
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.A, p.C), 9);
  });

  it('#21 "a) Giả sử AM vuông góc với BC" là giả thiết của ý, KHÔNG dựng (tam giác vẫn thường)', () => {
    const p = toaDoHinh('Cho tam giác ABC và M là trung điểm của đoạn thẳng BC.\na) Giả sử AM vuông góc với BC. Chứng minh rằng tam giác ABC cân tại A.\nb) Giả sử AM là tia phân giác của góc BAC. Chứng minh rằng tam giác ABC cân tại A.');
    expect(dist(p.B, p.M)).toBeCloseTo(dist(p.M, p.C), 9);
  });
});

