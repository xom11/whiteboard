// duKienSoDo: nhận câu hỏi đại lượng + số đo (không vẽ gì) — nhưng KHÔNG nhận dữ kiện hình dạng.
import { duKienSoDoRule } from '../duKienSoDo';
import { segmentClauses3D } from '../../deterministic/coverage3d';
import { tryDeterministicFigure3d } from '../../deterministic/tryDeterministicFigure3d';
import { dung3d, sub, dot, len, vuongGocMat, gan, goc, mid, chieuLenMat, dist } from '../../__tests__/helpers/toaDo3d';

const claimedTexts = (p: string) => {
  const cl = segmentClauses3D(p).filter((c) => c.hasGeometry);
  const ids = duKienSoDoRule.match({ problem: p, clauses: cl })[0]?.clauseIds ?? [];
  return cl.filter((c) => ids.includes(c.id)).map((c) => c.text);
};

describe('duKienSoDo', () => {
  it('Câu 3 (bộ lớp 12): câu hỏi thể tích + "SB tạo với đáy 30°" được nhận; hình vẫn đúng dữ kiện hình dạng', () => {
    const p = 'Cho hình chóp S.ABC có đáy là tam giác vuông tại B có AB = a, BC = a√3. Hình chiếu của đỉnh S trên mặt phẳng đáy trùng với trung điểm của cạnh AC. Biết SB tạo với đáy một góc 30°. Thể tích khối chóp S.ABC là:';
    expect(claimedTexts(p)).toEqual(['Biết SB tạo với đáy một góc 30°', 'Thể tích khối chóp S.ABC là:']);
    const { P } = dung3d(p);
    expect(gan(goc(P.A, P.B, P.C), 90)).toBe(true);
    const H = chieuLenMat(P.S, P.A, P.B, P.C);
    expect(len(sub(H, mid(P.A, P.C)))).toBeLessThan(1e-6);
    // SB tạo với đáy một góc NHỌN (không suy biến) — số đo không theo tỉ lệ
    const n: [number, number, number] = [0, 0, 1];
    const sb = sub(P.S, P.B);
    const ang = (Math.asin(Math.abs(dot(sb, n)) / len(sb)) * 180) / Math.PI;
    expect(ang).toBeGreaterThan(0);
    expect(ang).toBeLessThan(90);
  });

  it('dữ kiện HÌNH DẠNG ("tam giác ASB vuông") KHÔNG được nhận → đề không FULL', () => {
    const p = 'Cho hình chóp S.ABC có SA vuông góc với đáy, đáy là tam giác đều. Biết tam giác ASB vuông, thể tích khối chóp S.ABC là:';
    expect(claimedTexts(p)).not.toContain('Biết tam giác ASB vuông, thể tích khối chóp S.ABC là:');
    expect(tryDeterministicFigure3d(p).ok).toBe(false);
  });

  it('cạnh bên lăng trụ tạo góc 60° với đáy (hình đứng sẽ là 90°) → KHÔNG nhận', () => {
    const p = "Cho lăng trụ ABC.A'B'C' có đáy là tam giác đều cạnh a. Biết cạnh AA' tạo với đáy một góc 60°. Thể tích khối lăng trụ là:";
    expect(claimedTexts(p)).not.toContain("Biết cạnh AA' tạo với đáy một góc 60°");
    expect(tryDeterministicFigure3d(p).ok).toBe(false);
  });

  it('lăng trụ đứng: độ dài + góc (A\'BC) với đáy + câu hỏi → FULL, AA\' ⊥ đáy', () => {
    const p = "Cho lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác vuông cân tại B, AB = a. Biết mặt phẳng (A'BC) tạo với đáy một góc 60°. Thể tích khối lăng trụ đã cho là:";
    const { P } = dung3d(p);
    expect(vuongGocMat(P.A, P["A'"], P.A, P.B, P.C)).toBe(true);
    expect(gan(goc(P.A, P.B, P.C), 90)).toBe(true);
  });

  it('câu hỏi nhắc điểm chưa ai vẽ (O không được đặt tên) → không nhận', () => {
    const p = 'Cho hình chóp S.ABCD có đáy là hình vuông, SA vuông góc với đáy. Khoảng cách giữa hai đường thẳng OA và SC bằng';
    expect(claimedTexts(p)).toEqual([]);
  });

  it('đề chỉ có câu hỏi (không vật thể) → không nhận gì', () => {
    expect(claimedTexts('Thể tích khối cầu bán kính a bằng')).toEqual([]);
  });
  it('số đo viết hoa đầu câu + khoảng cách cho trước kèm đuôi câu hỏi (Câu 15, 52)', () => {
    const p1 = 'Cho hình chóp S.ABCD có đáy là hình vuông cạnh a, SA vuông góc với đáy. Cạnh bên SA = a√5. Thể tích khối chóp S.ABCD là:';
    expect(claimedTexts(p1)).toContain('Cạnh bên SA = a√5');
    const { P } = dung3d(p1);
    expect(vuongGocMat(P.S, P.A, P.A, P.B, P.C)).toBe(true);
    const p2 = "Cho lăng trụ đứng ABC.A'B'C' có đáy là tam giác đều cạnh a. Biết khoảng cách từ A đến mặt phẳng (A'BC) bằng (√6/3)a, thể tích khối lăng trụ đã cho bằng";
    expect(tryDeterministicFigure3d(p2).ok).toBe(true);
    const Q = dung3d(p2).P;
    expect(vuongGocMat(Q.A, Q["A'"], Q.A, Q.B, Q.C)).toBe(true);
    expect(gan(dist(Q.A, Q.B), dist(Q.B, Q.C))).toBe(true);
  });
});
