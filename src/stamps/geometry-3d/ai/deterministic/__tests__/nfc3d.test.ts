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
