// factAudit3d phải BẮT được hình sai (đo toạ độ), và không báo oan hình đúng.
import { auditFacts3d, extractFacts3d } from '../factAudit3d';
import { intentToScene3d } from '../../intentToScene3d';
import { solid, addPoint3d } from '../../intent';

const chop = (apexVariant: 'regular' | 'over-vertex', anchor?: string) =>
  solid({ flavor: 'pyramid', baseLabels: ['A', 'B', 'C'], baseVariant: 'triangle', apex: 'S', apexVariant, apexAnchor: anchor });

describe('factAudit3d', () => {
  it('SA ⊥ (ABC) nhưng S đặt trên tâm ⇒ vi phạm; S trên A ⇒ đúng', () => {
    const de = 'Cho hình chóp S.ABC có SA ⊥ (ABC).';
    expect(auditFacts3d(de, intentToScene3d([chop('regular')])).violated.map((f) => f.kind)).toContain('line⊥plane');
    expect(auditFacts3d(de, intentToScene3d([chop('over-vertex', 'A')])).violated).toEqual([]);
  });

  it('đáy "vuông tại B" trên tam giác thường ⇒ vi phạm góc vuông', () => {
    const de = 'Cho hình chóp S.ABC có đáy là tam giác vuông tại B.';
    expect(auditFacts3d(de, intentToScene3d([chop('regular')])).violated.map((f) => f.kind)).toEqual(['right-angle']);
  });

  it('trung điểm: đúng khi midpoint, sai khi điểm khác', () => {
    const de = 'Cho hình chóp S.ABC. Gọi M là trung điểm của SB.';
    const ok = intentToScene3d([chop('regular'), addPoint3d('M', { kind: 'midpoint', p1: 'S', p2: 'B' })]);
    const sai = intentToScene3d([chop('regular'), addPoint3d('M', { kind: 'centroid', vertices: ['S', 'A', 'B'] })]);
    expect(auditFacts3d(de, ok).violated).toEqual([]);
    expect(auditFacts3d(de, sai).violated.map((f) => f.kind)).toEqual(['midpoint']);
  });

  it('thiếu điểm ⇒ không kiểm (skipped), không phải vi phạm', () => {
    const a = auditFacts3d('Cho hình chóp S.ABC. Gọi M là trung điểm của SB.', intentToScene3d([chop('regular')]));
    expect(a.violated).toEqual([]);
    expect(a.skipped.map((f) => f.kind)).toEqual(['midpoint']);
  });

  it('rút đủ loại sự kiện phổ biến', () => {
    const kinds = extractFacts3d(
      'Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật tâm O, (SAB) và (SAD) cùng vuông góc với đáy. Hình chiếu vuông góc của S lên (ABCD) là trung điểm của AB. Gọi G là trọng tâm tam giác SAB, H thuộc cạnh AB sao cho HB = 2HA.',
    ).map((f) => f.kind);
    for (const k of ['plane⊥plane', 'parallelogram', 'right-angle', 'projection-foot', 'center', 'centroid', 'ratio-point']) expect(kinds).toContain(k);
  });
});
