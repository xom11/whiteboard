/** @jest-environment jsdom */
// Đề THẬT trong docs/datasets/lop8-2026-09.txt (và bài liên quan của
// hinh-phang-tong-hop-2026-09.txt). Mỗi ca ĐO hình dựng ra bằng JSXGraph thật —
// song song, vuông góc, tỉ lệ độ dài, điểm trong đoạn — không chỉ "đủ tên điểm".
import { toaDoHinh, dist, thuocDoan, type XY } from './helpers/toaDoHinh';

beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

const tich = (a: XY, b: XY, c: XY, d: XY) => (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
const vuongGoc = (a: XY, b: XY, c: XY, d: XY) => Math.abs(tich(a, b, c, d)) < 1e-9 * dist(a, b) * dist(c, d);

describe('lớp 8 — hình đúng dữ kiện đề', () => {
  it('lop8 #35: tam giác "cân tại ĐỈNH A", chiều cao AH = 3 cm, đáy BC = 10 cm', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại đỉnh A, chiều cao AH = 3 cm và cạnh đáy BC = 10 cm. Hãy tính độ dài các cạnh bên AB, AC.');
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.A, p.C), 9);
    expect(thuocDoan(p.H, p.B, p.C)).toBe(true);
    expect(vuongGoc(p.A, p.H, p.B, p.C)).toBe(true);
    expect(dist(p.A, p.H) / dist(p.B, p.C)).toBeCloseTo(3 / 10, 9);
  });

  it('hinh-phang #125: hai dây AB, CD VUÔNG GÓC nhau tại M, AB = 18, CD = 14, MC = 4', () => {
    const p = toaDoHinh('Cho đường tròn tâm O, hai dây AB và CD vuông góc với nhau ở M. Biết AB = 18 cm, CD = 14 cm, MC = 4 cm. Hãy tính khoảng cách từ tâm O đến mỗi dây AB và CD.');
    expect(vuongGoc(p.A, p.B, p.C, p.D)).toBe(true);
    expect(thuocDoan(p.M, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.M, p.C, p.D)).toBe(true);
    expect(dist(p.A, p.B) / dist(p.C, p.D)).toBeCloseTo(18 / 14, 9);
    expect(dist(p.M, p.C) / dist(p.C, p.D)).toBeCloseTo(4 / 14, 9);
    for (const x of 'ABCD') expect(dist(p.O, p[x])).toBeCloseTo(dist(p.O, p.A), 9);
  });

  it('hai dây vuông góc nhau KHÔNG số đo: vẫn ⊥ và cắt nhau trong đường tròn', () => {
    const p = toaDoHinh('Cho đường tròn (O;R). Vẽ hai dây AB và CD vuông góc với nhau tại M.');
    expect(vuongGoc(p.A, p.B, p.C, p.D)).toBe(true);
    expect(thuocDoan(p.M, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.M, p.C, p.D)).toBe(true);
  });

  // --- đường song song qua một điểm (Thalès) ---------------------------------
  const songSong = (a: XY, b: XY, c: XY, d: XY) =>
    Math.abs((b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])) < 1e-9 * dist(a, b) * dist(c, d);

  it('hinh-phang #83 / #86: "Qua D kẻ các đường thẳng song song với AB và AC, cắt AC và AB theo thứ tự ở E và F" — HAI đường', () => {
    const p = toaDoHinh('Cho tam giác ABC, qua điểm D thuộc cạnh BC, kẻ các đường thẳng song song với AB và AC, cắt AC và AB theo thứ tự ở E và F.');
    expect(thuocDoan(p.E, p.A, p.C)).toBe(true);
    expect(thuocDoan(p.F, p.A, p.B)).toBe(true);
    expect(songSong(p.D, p.E, p.A, p.B)).toBe(true);
    expect(songSong(p.D, p.F, p.A, p.C)).toBe(true);
    const q = toaDoHinh('Cho tam giác ABC vuông tại A, M là một điểm thuộc cạnh BC. Qua M vẽ các đường thẳng song song với AB và AC, chúng cắt các cạnh AC, AB theo thứ tự tại E và F.');
    expect(songSong(q.M, q.E, q.A, q.B)).toBe(true);
    expect(songSong(q.M, q.F, q.A, q.C)).toBe(true);
    expect(thuocDoan(q.E, q.A, q.C)).toBe(true);
  });

  it('lop8 #39: hai mảnh "kẻ … song song với AB cắt AC tại F và kẻ … song song với AC cắt AB tại E"', () => {
    const p = toaDoHinh('Cho tam giác ABC, từ điểm D trên cạnh BC, kẻ đường thẳng song song với AB cắt AC tại F và kẻ đường thẳng song song với AC cắt AB tại E.');
    expect(thuocDoan(p.D, p.B, p.C)).toBe(true);
    expect(songSong(p.D, p.F, p.A, p.B)).toBe(true);
    expect(songSong(p.D, p.E, p.A, p.C)).toBe(true);
    expect(thuocDoan(p.F, p.A, p.C)).toBe(true);
  });

  it('lop8 #41: "Kẻ IM song song với BK (M thuộc AC)" — M là GIAO, không phải điểm tự do trên AC', () => {
    const p = toaDoHinh('Cho tam giác ABC, điểm I thuộc cạnh AB, điểm K thuộc cạnh AC. Kẻ IM song song với BK (M thuộc AC), kẻ KN song song với CI (N thuộc AB).');
    expect(songSong(p.I, p.M, p.B, p.K)).toBe(true);
    expect(songSong(p.K, p.N, p.C, p.I)).toBe(true);
    expect(thuocDoan(p.M, p.A, p.C)).toBe(true);
    // Thalès đảo: MN // BC.
    expect(songSong(p.M, p.N, p.B, p.C)).toBe(true);
  });

  it('lop8 #44: "Từ điểm D (D ∈ AB) kẻ đường thẳng song song với BC cắt AC tại E"', () => {
    const p = toaDoHinh('Cho tam giác ABC. Từ điểm D (D ∈ AB) kẻ đường thẳng song song với BC cắt AC tại E.');
    expect(thuocDoan(p.D, p.A, p.B)).toBe(true);
    expect(songSong(p.D, p.E, p.B, p.C)).toBe(true);
    expect(thuocDoan(p.E, p.A, p.C)).toBe(true);
  });

  // --- tia đặt tên, trung điểm-điều kiện, cạnh huyền -----------------------------
  it('lop8 #60: "Từ A kẻ tia Ax ⊥ AC, từ B kẻ tia By ⊥ BC. Tia Ax và By cắt nhau tại K"', () => {
    const p = toaDoHinh('Cho tam giác ABC có ba góc nhọn. Từ A kẻ tia Ax vuông góc với AC, từ B kẻ tia By vuông góc với BC. Tia Ax và By cắt nhau tại K.');
    expect(vuongGoc(p.A, p.K, p.A, p.C)).toBe(true);
    expect(vuongGoc(p.B, p.K, p.B, p.C)).toBe(true);
  });

  it('lop8 #65: "Từ B kẻ tia Bx ⊥ AB, tia Bx cắt AH tại K"', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A (AB > AC), đường cao AH. Từ B kẻ tia Bx ⊥ AB, tia Bx cắt AH tại K.');
    expect(vuongGoc(p.B, p.K, p.A, p.B)).toBe(true);
    expect(Math.abs((p.H[0] - p.A[0]) * (p.K[1] - p.A[1]) - (p.H[1] - p.A[1]) * (p.K[0] - p.A[0]))).toBeLessThan(1e-9);
    expect(dist(p.A, p.B)).toBeGreaterThan(dist(p.A, p.C));
  });

  it('lop8 #33 / #25: "lấy điểm N sao cho I là trung điểm của MN" → N đối xứng M qua I', () => {
    const p = toaDoHinh('Cho tam giác ABC cân tại A, trung tuyến AM. Gọi I là trung điểm của AC. Trên tia MI lấy điểm N sao cho I là trung điểm của MN.');
    expect(p.I[0]).toBeCloseTo((p.M[0] + p.N[0]) / 2, 9);
    expect(p.I[1]).toBeCloseTo((p.M[1] + p.N[1]) / 2, 9);
  });

  it('lop8 #19: "điểm M trên cạnh huyền của tam giác ABC vuông cân tại A" — M ∈ BC, góc A VUÔNG', () => {
    const p = toaDoHinh('Xét một điểm M trên cạnh huyền của tam giác ABC vuông cân tại A. Gọi N và P lần lượt là hình chiếu vuông góc của M trên các cạnh AB và AC.');
    expect(thuocDoan(p.M, p.B, p.C)).toBe(true);
    expect(vuongGoc(p.A, p.B, p.A, p.C)).toBe(true);
    expect(dist(p.A, p.B)).toBeCloseTo(dist(p.A, p.C), 9);
    expect(vuongGoc(p.M, p.N, p.A, p.B)).toBe(true);
  });

  it('hinh-phang #78: "tam giác ABC vuông cân tại C" — hình mẫu cân trước đây KHÔNG vuông', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông cân tại C. Trên các cạnh AC, BC lấy lần lượt các điểm P, Q sao cho AP = CQ. Từ điểm P vẽ PM song song với BC (M ∈ AB).');
    expect(vuongGoc(p.C, p.A, p.C, p.B)).toBe(true);
    expect(songSong(p.P, p.M, p.B, p.C)).toBe(true);
    expect(thuocDoan(p.M, p.A, p.B)).toBe(true);
  });

  // --- câu hỏi không phải dựng hình ------------------------------------------
  it('lop8 #17: câu hỏi "Khi tam giác ABD vuông cân tại A, hãy tính …" KHÔNG vẽ lại ABD đè lên hình bình hành; P trên TIA AB, AP = 2AB', () => {
    const p = toaDoHinh('Cho hình bình hành ABCD. Lấy điểm P trên tia AB sao cho AP = 2AB.\na) Tứ giác BPCD có phải là hình bình hành không? Tại sao?\nb) Khi tam giác ABD vuông cân tại A, hãy tính số đo các góc của tứ giác BPCD.');
    expect(songSong(p.A, p.B, p.C, p.D)).toBe(true);
    expect(songSong(p.A, p.D, p.B, p.C)).toBe(true);
    expect(dist(p.A, p.P)).toBeCloseTo(2 * dist(p.A, p.B), 9);
    expect(dist(p.A, p.P)).toBeCloseTo(dist(p.A, p.B) + dist(p.B, p.P), 9);
  });

  it('hinh-phang #144: "a) Tứ giác BFCH là hình gì? b) Gọi M là trung điểm của BC" — M vẫn dựng (tách câu ở "?")', () => {
    const p = toaDoHinh('Cho tam giác ABC nội tiếp đường tròn (O), hai đường cao BD và CE cắt nhau tại H. Vẽ đường kính AF.\na) Tứ giác BFCH là hình gì?\nb) Gọi M là trung điểm của BC. Chứng minh rằng ba điểm H, M, F thẳng hàng.');
    expect(p.M[0]).toBeCloseTo((p.B[0] + p.C[0]) / 2, 9);
    expect(p.M[1]).toBeCloseTo((p.B[1] + p.C[1]) / 2, 9);
  });

  // --- đường thẳng tự do qua một điểm; trung tuyến "BD và CE"; "//" ------------
  const thangHang = (a: XY, b: XY, c: XY) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-9;

  it('lop8 #57: "Một đường thẳng đi qua D cắt đoạn BC và tia AB tại M và N" — M ∈ BC, N trên tia AB, D-M-N thẳng hàng', () => {
    const p = toaDoHinh('Cho hình bình hành ABCD. Một đường thẳng đi qua D lần lượt cắt đoạn thẳng BC và tia AB tại M và N sao cho điểm M nằm giữa hai điểm B và C.');
    expect(thuocDoan(p.M, p.B, p.C)).toBe(true);
    expect(thangHang(p.D, p.M, p.N)).toBe(true);
    expect(thangHang(p.A, p.B, p.N)).toBe(true);
    expect(dist(p.A, p.N)).toBeGreaterThan(dist(p.A, p.B)); // trên tia AB, vượt B
  });

  it('lop8 #14: đường qua tâm O hình bình hành cắt HAI CẠNH AB, CD tại M, N (O trung điểm MN)', () => {
    const p = toaDoHinh('Gọi O là giao điểm của hai đường chéo của hình bình hành ABCD. Một đường thẳng đi qua O lần lượt cắt các cạnh AB, CD của hình bình hành tại hai điểm M, N.');
    expect(thuocDoan(p.M, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.N, p.C, p.D)).toBe(true);
    expect(p.O[0]).toBeCloseTo((p.M[0] + p.N[0]) / 2, 9);
  });

  it('lop8 #47: "các đường trung tuyến BD và CE cắt nhau tại G" (danh sách nối "và")', () => {
    const p = toaDoHinh('Cho tam giác ABC, các đường trung tuyến BD và CE cắt nhau tại G. Gọi I, K lần lượt là trung điểm của GB, GC.');
    expect(p.D[0]).toBeCloseTo((p.A[0] + p.C[0]) / 2, 9);
    expect(p.E[0]).toBeCloseTo((p.A[0] + p.B[0]) / 2, 9);
    expect(p.G[0]).toBeCloseTo((p.A[0] + p.B[0] + p.C[0]) / 3, 9);
  });

  it('lop8 #51: "Tam giác ABC có …" (viết hoa đầu câu) + "Qua D vẽ DE // AB (E ∈ AC)" — E dựng, tam giác vuông 15-20-25', () => {
    const p = toaDoHinh('Tam giác ABC có AB = 15 cm, AC = 20 cm, BC = 25 cm. Đường phân giác của góc BAC cắt BC tại D. Qua D vẽ DE // AB (E ∈ AC).');
    expect(vuongGoc(p.A, p.B, p.A, p.C)).toBe(true);
    expect(songSong(p.D, p.E, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.E, p.A, p.C)).toBe(true);
    expect(dist(p.B, p.D) / dist(p.D, p.C)).toBeCloseTo(15 / 20, 9); // tính chất phân giác
  });

  it('lop8 #45: "Lấy điểm D và E trên cạnh AB sao cho AD = DE = EB"', () => {
    const p = toaDoHinh('Cho tam giác ABC có trung tuyến AM. Lấy điểm D và E trên cạnh AB sao cho AD = DE = EB và D nằm giữa hai điểm A, E.');
    expect(dist(p.A, p.D)).toBeCloseTo(dist(p.A, p.B) / 3, 9);
    expect(dist(p.A, p.E)).toBeCloseTo((2 * dist(p.A, p.B)) / 3, 9);
    expect(thuocDoan(p.E, p.A, p.B)).toBe(true);
  });

  // --- tia phân giác cắt nhiều đường; điểm trên tia theo số đo -------------------
  /** P nằm trên tia phân giác góc (p1, v, p2): góc(p1,v,P) = góc(P,v,p2). */
  const goc = (v: XY, a: XY, b: XY) => Math.acos(tich(v, a, v, b) / (dist(v, a) * dist(v, b)));
  const tia = (P: XY, p1: XY, v: XY, p2: XY) => Math.abs(goc(v, p1, P) - goc(v, P, p2)) < 1e-9;

  it('lop8 #53: "Tia phân giác của góc ABC lần lượt cắt các đoạn thẳng AM, AC tại D, E"', () => {
    const p = toaDoHinh('Cho tam giác ABC có đường trung tuyến AM. Tia phân giác của góc ABC lần lượt cắt các đoạn thẳng AM, AC tại điểm D, E.');
    expect(tia(p.D, p.A, p.B, p.C)).toBe(true);
    expect(tia(p.E, p.A, p.B, p.C)).toBe(true);
    expect(thuocDoan(p.D, p.A, p.M)).toBe(true);
    expect(thuocDoan(p.E, p.A, p.C)).toBe(true);
  });

  it('hinh-phang #110: "Tia phân giác của góc B cắt AH, AC lần lượt tại D, E"', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A, đường cao AH. Tia phân giác của góc B cắt AH, AC lần lượt tại D, E.');
    expect(tia(p.D, p.A, p.B, p.C)).toBe(true);
    expect(thuocDoan(p.D, p.A, p.H)).toBe(true);
    expect(thuocDoan(p.E, p.A, p.C)).toBe(true);
  });

  it('lop8 #52: hai phân giác khác đỉnh "góc AMB cắt AB tại D và … góc AMC cắt AC tại E" ⇒ DE // BC', () => {
    const p = toaDoHinh('Cho tam giác ABC có đường trung tuyến AM. Đường phân giác của góc AMB cắt AB tại D và đường phân giác góc AMC cắt AC tại E.');
    expect(tia(p.D, p.A, p.M, p.B)).toBe(true);
    expect(tia(p.E, p.A, p.M, p.C)).toBe(true);
    expect(songSong(p.D, p.E, p.B, p.C)).toBe(true);
  });

  it('lop8 #56: "Trên các tia AB, AC lần lượt lấy M, N sao cho AM = 10 cm, AN = 8 cm" (AB = 12, AC = 15)', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = 12 cm, AC = 15 cm. Trên các tia AB, AC lần lượt lấy các điểm M, N sao cho AM = 10 cm, AN = 8 cm.');
    expect(dist(p.A, p.M) / dist(p.A, p.B)).toBeCloseTo(10 / 12, 9);
    expect(dist(p.A, p.N) / dist(p.A, p.C)).toBeCloseTo(8 / 15, 9);
    expect(thuocDoan(p.M, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.N, p.A, p.C)).toBe(true);
  });

  // --- đường ⊥ tại điểm cắt nhau; đường ∥ hai đáy; "đường thẳng đó" ---------------
  it('lop8 #9: "Kẻ đường thẳng ⊥ AC tại C và đường thẳng ⊥ BD tại D, hai đường thẳng này cắt nhau tại E"', () => {
    const p = toaDoHinh('Cho hình thang ABCD (AB // CD). Kẻ đường thẳng vuông góc với AC tại C và đường thẳng vuông góc với BD tại D, hai đường thẳng này cắt nhau tại E.');
    expect(vuongGoc(p.C, p.E, p.A, p.C)).toBe(true);
    expect(vuongGoc(p.D, p.E, p.B, p.D)).toBe(true);
  });

  it('lop8 #42: "Đường thẳng d song song với hai đáy cắt AD, BC tại M, N; cắt đường chéo AC tại P" (AB = 4, CD = 6)', () => {
    const p = toaDoHinh('Cho hình thang ABCD (AB // CD) có AB = 4 cm, CD = 6 cm. Đường thẳng d song song với hai đáy và cắt hai cạnh bên AD, BC của hình thang đó lần lượt tại M, N; cắt đường chéo AC tại P.');
    expect(dist(p.C, p.D) / dist(p.A, p.B)).toBeCloseTo(6 / 4, 9);
    expect(songSong(p.M, p.N, p.A, p.B)).toBe(true);
    expect(thuocDoan(p.M, p.A, p.D)).toBe(true);
    expect(thuocDoan(p.N, p.B, p.C)).toBe(true);
    expect(thuocDoan(p.P, p.A, p.C)).toBe(true);
    expect(thuocDoan(p.P, p.M, p.N)).toBe(true);
  });

  it('lop8 #13: "Qua điểm M bất kì thuộc cạnh AC, vẽ đường thẳng song song với CD. Đường thẳng đó cắt BD tại N"', () => {
    const p = toaDoHinh('Cho hình thang cân ABCD (AB // CD, AB < CD). Qua điểm M bất kì thuộc cạnh AC, vẽ đường thẳng song song với CD. Đường thẳng đó cắt BD tại N.');
    expect(thuocDoan(p.M, p.A, p.C)).toBe(true);
    expect(songSong(p.M, p.N, p.C, p.D)).toBe(true);
    expect(thuocDoan(p.N, p.B, p.D)).toBe(true);
  });

  // --- đường cao theo tam giác chứa nó; tam giác từ chân đường cao --------------
  it('lop8 #62: "AH, HD lần lượt là các đường cao kẻ từ đỉnh A của tam giác ABC và đỉnh H của tam giác HAB" (trước: H trùng B)', () => {
    const p = toaDoHinh('Cho tam giác ABC vuông tại A có AB = 5 cm, AC = 4 cm. Gọi AH, HD lần lượt là các đường cao kẻ từ đỉnh A của tam giác ABC và đỉnh H của tam giác HAB.');
    expect(thuocDoan(p.H, p.B, p.C)).toBe(true);
    expect(vuongGoc(p.A, p.H, p.B, p.C)).toBe(true);
    expect(thuocDoan(p.D, p.A, p.B)).toBe(true);
    expect(vuongGoc(p.H, p.D, p.A, p.B)).toBe(true);
    expect(dist(p.A, p.B) / dist(p.A, p.C)).toBeCloseTo(5 / 4, 9);
  });

  it('lop8 #38: "đường cao AH, AH = 12, CH = 9, BH = 16" ⇒ đúng tỉ lệ (và vuông tại A như đề yêu cầu chứng minh)', () => {
    const p = toaDoHinh('Cho tam giác ABC có đường cao AH. Biết AH = 12 cm, CH = 9 cm, BH = 16 cm. Lấy M, N lần lượt là trung điểm của AH, BH.');
    expect(thuocDoan(p.H, p.B, p.C)).toBe(true);
    expect(dist(p.B, p.H) / dist(p.C, p.H)).toBeCloseTo(16 / 9, 9);
    expect(dist(p.A, p.H) / dist(p.C, p.H)).toBeCloseTo(12 / 9, 9);
    expect(vuongGoc(p.A, p.B, p.A, p.C)).toBe(true);
  });

  // --- hình bình hành có ba đỉnh sẵn --------------------------------------------
  it('lop8 #27: "hình thoi ABCD và hình bình hành BCMD" — M dựng (A, D, M thẳng hàng như đề), không tự do', () => {
    const p = toaDoHinh('Cho hình thoi ABCD và hình bình hành BCMD. Gọi O là giao điểm của AC và BD.');
    expect(songSong(p.B, p.C, p.D, p.M)).toBe(true);
    expect(songSong(p.C, p.M, p.B, p.D)).toBe(true);
    expect(Math.abs((p.D[0] - p.A[0]) * (p.M[1] - p.A[1]) - (p.D[1] - p.A[1]) * (p.M[0] - p.A[0]))).toBeLessThan(1e-9);
  });

  it('"Cho tam giác ABC. Vẽ hình bình hành ABDC" — D = B + C − A', () => {
    const p = toaDoHinh('Cho tam giác ABC. Vẽ hình bình hành ABDC.');
    expect(p.D[0]).toBeCloseTo(p.B[0] + p.C[0] - p.A[0], 9);
    expect(p.D[1]).toBeCloseTo(p.B[1] + p.C[1] - p.A[1], 9);
  });

  // --- đường cao hình thang; guard chân cevian ------------------------------------
  it('"hình thang cân ABCD (AB // CD, AB < CD), đường cao AH, BK" — H, K chân ⊥ trên CD (trước: báo full mà thiếu H, K)', () => {
    const p = toaDoHinh('Cho hình thang cân ABCD (AB // CD, AB < CD), đường cao AH, BK.');
    expect(thuocDoan(p.H, p.C, p.D)).toBe(true);
    expect(thuocDoan(p.K, p.C, p.D)).toBe(true);
    expect(vuongGoc(p.A, p.H, p.C, p.D)).toBe(true);
    expect(vuongGoc(p.B, p.K, p.C, p.D)).toBe(true);
  });

  it('"hình bình hành ABCD, đường cao AH" (không rõ xuống cạnh nào) → KHÔNG báo full', () => {
    expect(() => toaDoHinh('Cho hình bình hành ABCD, đường cao AH.')).toThrow(/named-missing/);
  });
});
