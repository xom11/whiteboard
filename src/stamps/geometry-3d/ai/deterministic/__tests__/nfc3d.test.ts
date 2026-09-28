// Đề dạng Unicode TỔ HỢP (NFD) phải dựng y như NFC — đo toạ độ.
import { tryDeterministicFigure3d } from '../tryDeterministicFigure3d';
import { toaDo3d } from '../factAudit3d';

it('NFD ("hình" = h+i+◌̀) dựng được và SA ⊥ đáy như bản NFC', () => {
  const nfc = 'Cho hình chóp S.ABC có đáy là tam giác vuông tại B, SA ⊥ (ABC). Gọi M là trung điểm của SC.';
  const nfd = nfc.normalize('NFD');
  expect(nfd).not.toBe(nfc);
  const a = tryDeterministicFigure3d(nfc), b = tryDeterministicFigure3d(nfd);
  expect(a.ok && b.ok).toBe(true);
  if (!a.ok || !b.ok) return;
  const P = toaDo3d(b.state), Q = toaDo3d(a.state);
  expect(P).toEqual(Q);
  expect([P.S[0] - P.A[0], P.S[1] - P.A[1]]).toEqual([0, 0]);
});

it('ký hiệu font Symbol dạng PUA ("\\uf028SBC\\uf029", "\\uf05e") ⇒ dựng như bản thường, chân ⊥ đúng mặt (SBC)', () => {
  const pua = 'Cho hình chóp S.ABC có SA \uf05e (ABC), ABC là tam giác đều cạnh a. Khoảng cách từ A đến mặt phẳng \uf028SBC\uf029 bằng';
  const r = tryDeterministicFigure3d(pua);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const P = toaDo3d(r.state);
  expect([P.S[0] - P.A[0], P.S[1] - P.A[1]]).toEqual([0, 0]);
  // HA là chân ⊥ từ A xuống (SBC): (A − HA) ⊥ SB và ⊥ SC
  const v = [0, 1, 2].map((k) => P.A[k] - P.HA[k]);
  const d = (u: number[], w: number[]) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
  expect(Math.abs(d(v, [0, 1, 2].map((k) => P.B[k] - P.S[k])))).toBeLessThan(1e-9);
  expect(Math.abs(d(v, [0, 1, 2].map((k) => P.C[k] - P.S[k])))).toBeLessThan(1e-9);
});
