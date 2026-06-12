// Batch vao10 2026-06-12 — mở rộng rule cho các cluster fail lớn của dataset
// "Tuyển tập 400 bài toán hình học vào lớp 10" (docs/datasets/tuyen-tap-400-hinh-vao-10.txt).
// Mỗi describe = 1 cluster; đề test lấy/giản lược từ bài fail thật (id ghi kèm).
import { perpDiametersRule } from '../perpDiameters';
import { perpFootRule } from '../perpFoot';
import { arcMidpointRule } from '../arcMidpoint';
import { perpChordAtFootRule } from '../perpChordAtFoot';
import { givenDiameterCircleRule } from '../givenDiameterCircle';
import { onCirclePointRule } from '../onCirclePoint';
import { intersectionRule } from '../intersection';
import { diameterEndpointRule } from '../diameterEndpoint';
import { circleExternalPointRule } from '../circleExternalPoint';
import { lineCircleIntersectionRule } from '../lineCircleIntersection';
import { circleDiameterRule } from '../circleDiameter';
import { segmentClauses } from '../../deterministic/coverage';
import type { LanguageRule } from '../_types';

function intentsOf(rule: LanguageRule, problem: string) {
  return rule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents as any[]);
}

describe('perpDiameters — biến thể vao10 (69/72/127/216)', () => {
  function expectFourOnCircle(problem: string) {
    const all = intentsOf(perpDiametersRule, problem);
    const onCircle = all.filter((i) => i.constraint?.kind === 'onCircle');
    expect(onCircle.map((i) => i.name).sort()).toEqual(['A', 'B', 'C', 'D']);
    const byName = Object.fromEntries(onCircle.map((i) => [i.name, i.constraint.theta]));
    expect(byName.A).toBeCloseTo(0);
    expect(byName.B).toBeCloseTo(Math.PI);
    expect(byName.C).toBeCloseTo(Math.PI / 2);
    expect(byName.D).toBeCloseTo((3 * Math.PI) / 2);
  }

  it('tính-từ-TRƯỚC tên: "(O;R) có hai đường kính vuông góc AB và CD" (127)', () => {
    expectFourOnCircle(
      'Cho đường tròn (O;R) có hai đường kính vuông góc AB và CD. Gọi I là trung điểm của OB.',
    );
  });

  it('separator PHẨY + paren bare "(O)": "Cho (O), hai đường kính AB, CD vuông góc với nhau" (72)', () => {
    expectFourOnCircle('Cho (O), hai đường kính AB, CD vuông góc với nhau.');
  });

  it('"đường tròn tâm O" không paren (216)', () => {
    expectFourOnCircle(
      'Cho đường tròn tâm O có hai đường kính AB, CD vuông góc với nhau.',
    );
  });
});

describe('perpFoot — "Hạ XY và ZW cùng vuông góc (với)? L" (51/76/84)', () => {
  it('"Hạ BE và CF cùng vuông góc với AK" → E=foot(B,AK), F=foot(C,AK)', () => {
    const all = intentsOf(
      perpFootRule,
      'Cho tam giác ABC nhọn nội tiếp đường tròn (O). Kẻ đường cao AD và đường kính AK. Hạ BE và CF cùng vuông góc với AK.',
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'E',
        constraint: { kind: 'perpFoot', from: 'B', onLine: 'AK' },
      }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'F',
        constraint: { kind: 'perpFoot', from: 'C', onLine: 'AK' },
      }),
    );
  });

  it('"với" optional: "Hạ BE và CF cùng vuông góc AK" (51)', () => {
    const all = intentsOf(
      perpFootRule,
      'Cho tam giác ABC nhọn nội tiếp (O). Kẻ đường cao AD và đường kính AK. Hạ BE và CF cùng vuông góc AK.',
    );
    const feet = all.filter((i) => i.constraint?.kind === 'perpFoot' && i.constraint.onLine === 'AK');
    expect(feet.map((i) => i.name).sort()).toEqual(['E', 'F']);
  });
});

describe('arcMidpoint — nửa đường tròn compact "(O;R)" không chữ "đường tròn" (35)', () => {
  it('"Cho nửa (O;R) đường kính AB. C là điểm chính giữa cung AB." → arcMidpoint C, không containment', () => {
    const all = intentsOf(
      arcMidpointRule,
      'Cho nửa (O;R) đường kính AB. C là điểm chính giữa cung AB.',
    );
    const arc = all.filter((i) => i.constraint?.kind === 'arcMidpoint');
    expect(arc).toHaveLength(1);
    expect(arc[0].name).toBe('C');
    expect(arc[0].constraint.a).toBe('A');
    expect(arc[0].constraint.b).toBe('B');
    expect(arc[0].constraint.notContaining).toBeUndefined();
    expect(arc[0].constraint.containing).toBeUndefined();
  });
});

describe('perpChordAtFoot — dây ⊥ đường kính tại H, KHÔNG đầu mút nào có trước (61/94/126)', () => {
  const P =
    'Cho đường tròn (O;R), đường kính AB. Điểm H thuộc đoạn OA. Kẻ dây CD ⊥ AB tại H. AC cắt BD tại K.';

  it('emit perp-line qua H + C=rightAngleViewing(A,B) + D=reflectLine(C qua AB)', () => {
    const all = intentsOf(perpChordAtFootRule, P);
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'draw-line',
        name: 'pcH',
        kind: 'perpThrough',
        through: 'H',
        to: 'AB',
      }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'C',
        constraint: { kind: 'rightAngleViewing', a: 'A', b: 'B', onLine: 'pcH' },
      }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'D',
        constraint: { kind: 'reflectLine', of: 'C', through: 'AB' },
      }),
    );
  });

  it('vẫn emit H onSegment (first-wins nhường khi H đã có rule khác dựng)', () => {
    const all = intentsOf(perpChordAtFootRule, P);
    const h = all.find((i) => i.op === 'add-point' && i.name === 'H');
    expect(h?.constraint?.kind).toBe('onSegment');
    expect(h?.constraint?.of).toBe('AB');
  });

  it('đầu mút ĐÃ xuất hiện trước trong đề → giữ path cũ (reflectLine + perpFoot)', () => {
    const all = intentsOf(
      perpChordAtFootRule,
      'Cho đường tròn (O;R), đường kính AB, C là điểm trên đường tròn. Kẻ dây CD vuông góc với AB tại H.',
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'D',
        constraint: { kind: 'reflectLine', of: 'C', through: 'AB' },
      }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'H',
        constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' },
      }),
    );
    expect(all.some((i) => i.constraint?.kind === 'rightAngleViewing')).toBe(false);
  });
});

describe('givenDiameterCircle — emit tâm O ngầm khi đề tham chiếu O (94)', () => {
  it('"đường tròn đường kính AD" + "đoạn OD" → O = midpoint AD', () => {
    const all = intentsOf(
      givenDiameterCircleRule,
      'Cho đường tròn đường kính AD. Gọi H là điểm thuộc đoạn OD. Kẻ dây BC ⊥ AD tại H.',
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'O',
        constraint: { kind: 'midpoint', of: 'AD' },
      }),
    );
  });

  it('đề KHÔNG nhắc O → không emit O', () => {
    const all = intentsOf(
      givenDiameterCircleRule,
      'Cho nửa đường tròn đường kính AB. Lấy điểm M thuộc nửa đường tròn.',
    );
    expect(all.some((i) => i.name === 'O')).toBe(false);
  });
});

describe('onCirclePoint — "Gọi C,D là các điểm nằm trên (O)" (12)', () => {
  it('2 điểm onCircle với theta khác nhau', () => {
    const all = intentsOf(
      onCirclePointRule,
      'Cho nửa đường tròn tâm O đường kính AB, kẻ tiếp tuyến Bx với (O). Gọi C,D là các điểm nằm trên (O).',
    );
    const onCircle = all.filter((i) => i.constraint?.kind === 'onCircle');
    expect(onCircle.map((i) => i.name).sort()).toEqual(['C', 'D']);
    expect(onCircle[0].constraint.theta).not.toBeCloseTo(onCircle[1].constraint.theta);
  });
});

describe('perpDiameters — separator ";" + claim clause đuôi bị split (73/169/188)', () => {
  const P = 'Cho (O;R) có hai đường kính AB;CD vuông góc với nhau. Trên đoạn AB lấy điểm M.';

  it('"AB;CD vuông góc với nhau" → 4 onCircle', () => {
    const all = perpDiametersRule
      .match({ problem: P, clauses: segmentClauses(P) })
      .flatMap((m) => m.intents as any[]);
    const onCircle = all.filter((i) => i.constraint?.kind === 'onCircle');
    expect(onCircle.map((i) => i.name).sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('claim CẢ clause đuôi "CD vuông góc với nhau" (split tại ";")', () => {
    const clauses = segmentClauses(P);
    const tail = clauses.find((c) => /^CD\s+vuông/u.test(c.text.trim()));
    expect(tail).toBeDefined();
    const m = perpDiametersRule.match({ problem: P, clauses });
    expect(m[0].clauseIds).toContain(tail!.id);
  });
});

describe('circleDiameter — "Cho (O) đường kính AC" bare-given (139/180) + "(O;R), đường kính AB" (16)', () => {
  it('"Cho (O) đường kính AC" → A,C free + O midpoint + circle O_c', () => {
    const all = intentsOf(circleDiameterRule, 'Cho (O) đường kính AC. Trên đoạn OC lấy điểm B.');
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'O', constraint: { kind: 'midpoint', of: 'AC' } }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'draw-circle', name: 'O_c', spec: 'diameter', endpoints: ['A', 'C'] }),
    );
    expect(all.filter((i) => i.constraint?.kind === 'free').map((i) => i.name).sort()).toEqual(['A', 'C']);
  });

  it('"Cho (O;R), đường kính AB" (phẩy giữa paren và đường kính)', () => {
    const all = intentsOf(circleDiameterRule, 'Cho (O;R), đường kính AB. Lấy điểm M thuộc cung AB.');
    expect(all).toContainEqual(
      expect.objectContaining({ op: 'draw-circle', name: 'O_c', spec: 'diameter', endpoints: ['A', 'B'] }),
    );
  });
});

describe('circleExternalPoint — biến thể vao10 (28/31/259/268)', () => {
  function expectExternal(problem: string, center: string, ext: string) {
    const all = intentsOf(circleExternalPointRule, problem);
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: ext,
        constraint: { kind: 'externalToCircle', circle: center },
      }),
    );
  }

  it('paren bare: "Cho (O) và điểm A nằm ngoài (O)" (259/268)', () => {
    expectExternal('Cho (O) và điểm A nằm ngoài (O). Kẻ các tiếp tuyến AB, AC.', 'O', 'A');
  });

  it('đảo: "Cho điểm M nằm ngoài đường tròn tâm O" (28)', () => {
    expectExternal('Cho điểm M nằm ngoài đường tròn tâm O. Vẽ tiếp tuyến MA, MB với đường tròn.', 'O', 'M');
  });

  it('đảo không tâm sau "ngoài": resolve tâm từ đề "đường tròn O" (31)', () => {
    expectExternal('Cho đường tròn O và một điểm A nằm ngoài đường tròn. Kẻ các tiếp tuyến AB, AC với đường tròn.', 'O', 'A');
  });
});

describe('diameterEndpoint — "Kẻ đường cao AD VÀ đường kính AK" (51/76/84)', () => {
  it('K = reflectPoint(A qua O) dù "đường cao AD và" chen giữa verb và "đường kính"', () => {
    const all = intentsOf(
      diameterEndpointRule,
      'Cho tam giác ABC nhọn nội tiếp đường tròn (O). Kẻ đường cao AD và đường kính AK.',
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'K',
        constraint: { kind: 'reflectPoint', of: 'A', through: 'O' },
      }),
    );
  });
});

describe('lineCircleIntersection — circle compact "(O;R)" (127/232)', () => {
  it('"Tia CI cắt đường tròn (O;R) tại E" → E = secondIntersection(CI, O, other C)', () => {
    const all = intentsOf(
      lineCircleIntersectionRule,
      'Cho đường tròn (O;R) có hai đường kính vuông góc AB và CD. Gọi I là trung điểm của OB. Tia CI cắt đường tròn (O;R) tại E.',
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'E',
        constraint: { kind: 'secondIntersection', line: 'CI', circle: 'O', other: 'C' },
      }),
    );
  });
});

describe('circleDiameter — bare paren "(I) đường kính AH", 2 đầu mút đã có (61)', () => {
  const P =
    'Cho (O;R) đường kính AB. Điểm H thuộc OA. Vẽ (I) đường kính AH và (K) đường kính BH.';

  it('emit I=midpoint(AH)+circle I_c, K=midpoint(BH)+circle K_c — KHÔNG free lại đầu mút', () => {
    const all = intentsOf(circleDiameterRule, P);
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'I',
        constraint: { kind: 'midpoint', of: 'AH' },
      }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'draw-circle',
        name: 'I_c',
        spec: 'diameter',
        endpoints: ['A', 'H'],
      }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'K',
        constraint: { kind: 'midpoint', of: 'BH' },
      }),
    );
    // Đầu mút A/H/B đã có từ trước — dạng bare-paren không emit free trùng.
    const frees = all.filter(
      (i) => i.constraint?.kind === 'free' && ['H'].includes(i.name),
    );
    expect(frees).toEqual([]);
  });

  it('đầu mút CHƯA xuất hiện trước → không emit (fail-safe escalate)', () => {
    const all = intentsOf(circleDiameterRule, 'Cho tam giác MNP. Vẽ (I) đường kính XY.');
    expect(all.some((i) => i.name === 'I')).toBe(false);
  });
});

describe('vocabulary — "nằm trên" là geo-keyword (12)', () => {
  it('clause "Gọi C,D là các điểm nằm trên (O)" có hasGeometry=true', () => {
    const clauses = segmentClauses(
      'Cho nửa đường tròn tâm O đường kính AB. Gọi C,D là các điểm nằm trên (O). Các tia AC, AD cắt Bx tại E, F.',
    );
    const cl = clauses.find((c) => c.text.includes('nằm trên'));
    expect(cl).toBeDefined();
    expect(cl!.hasGeometry).toBe(true);
  });
});

describe('intersection — zip "R1, R2 cắt L tại E, F" với L là tia/đường đặt tên (12)', () => {
  it('"Các tia AC, AD cắt Bx tại E, F" → E=AC∩Bx, F=AD∩Bx', () => {
    const all = intentsOf(
      intersectionRule,
      'Cho nửa đường tròn tâm O đường kính AB, kẻ tiếp tuyến Bx với (O). Các tia AC, AD cắt Bx tại E, F.',
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'E',
        constraint: { kind: 'intersection', of: ['AC', 'Bx'] },
      }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({
        op: 'add-point',
        name: 'F',
        constraint: { kind: 'intersection', of: ['AD', 'Bx'] },
      }),
    );
  });
});
