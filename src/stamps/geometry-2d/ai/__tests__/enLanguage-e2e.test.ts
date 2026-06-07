// src/stamps/geometry-2d/ai/__tests__/enLanguage-e2e.test.ts
//
// E2E (issue #46 group B): English-language phrasing through the FULL
// deterministic-first gate (tryDeterministicFigure). Asserts:
//   1. Parallel VN/EN matrix — EN renders ({ok:true}) and produces intents
//      EQUIVALENT to the VN counterpart (same ops/shapes/variants/constraints).
//   2. Escalate-safe — unsupported / incomplete-coverage EN → {ok:false}.
import { tryDeterministicFigure } from '../deterministic/tryDeterministicFigure';

/** Stable "shape" of the figure intents for equivalence comparison (op + key
 *  semantic fields), order-independent (sorted). Ignores explicitCoords / names
 *  that don't change the construct semantics. */
function intentSig(r: ReturnType<typeof tryDeterministicFigure>): string[] {
  if (!r.ok) throw new Error('expected ok figure');
  return r.figure.intents
    .map((i: any) => {
      if (i.op === 'draw-shape') return `shape:${i.shape}:${i.variant}:${(i.labels ?? []).join('')}`;
      if (i.op === 'add-point') return `point:${i.name}:${i.constraint?.kind}:${i.constraint?.of ?? ''}`;
      if (i.op === 'draw-circle') {
        const extra =
          i.spec === 'centerRadius'
            ? `${i.center}:${i.radius}`
            : i.spec === 'centerThrough'
            ? `${i.center}:${i.through}`
            : '';
        return `circle:${i.spec}:${extra}`;
      }
      if (i.op === 'connect') return `connect:${i.from}-${i.to}:${i.style}`;
      return `${i.op}`;
    })
    .sort();
}

describe('EN language e2e (issue #46 group B)', () => {
  describe('parallel VN/EN matrix — EN renders + matches VN', () => {
    const matrix: Array<{ name: string; en: string; vi: string }> = [
      { name: 'plain triangle', en: 'Triangle ABC', vi: 'Cho tam giác ABC' },
      {
        name: 'right triangle with named vertex',
        en: 'Right triangle ABC, right angle at A',
        vi: 'Cho tam giác ABC vuông tại A',
      },
      { name: 'square', en: 'Square ABCD', vi: 'Cho hình vuông ABCD' },
      { name: 'rectangle', en: 'Rectangle ABCD', vi: 'Cho hình chữ nhật ABCD' },
      { name: 'circle paren radius', en: 'Circle (O; 3)', vi: 'Cho đường tròn (O; 3)' },
      {
        name: 'triangle + midpoint',
        en: 'Triangle ABC. M is the midpoint of BC.',
        vi: 'Cho tam giác ABC. Gọi M là trung điểm BC',
      },
      {
        name: 'triangle + centroid',
        en: 'Triangle ABC. G is the centroid of triangle ABC.',
        vi: 'Cho tam giác ABC. G là trọng tâm tam giác ABC',
      },
      {
        name: 'triangle + circumcenter',
        en: 'Triangle ABC. O is the circumcenter of triangle ABC.',
        // VN dùng "tâm ngoại tiếp" (điểm tâm) — tương đương circumcenter point
        // không kèm đường tròn (phrasing "tâm đường tròn ngoại tiếp" sẽ thêm
        // intent đường tròn tên O ⇒ không cùng intent-sig với EN).
        vi: 'Cho tam giác ABC. Gọi O là tâm ngoại tiếp tam giác ABC',
      },
    ];

    for (const { name, en, vi } of matrix) {
      it(`${name}: EN ok + equivalent to VN`, () => {
        const re = tryDeterministicFigure(en);
        const rv = tryDeterministicFigure(vi);
        expect(re.ok).toBe(true);
        expect(rv.ok).toBe(true);
        expect(intentSig(re)).toEqual(intentSig(rv));
      });
    }

    it('circle with center O and radius 3 (EN words) → ok + equivalent to VN words', () => {
      const re = tryDeterministicFigure('Circle with center O and radius 3');
      const rv = tryDeterministicFigure('Cho đường tròn tâm O bán kính 3');
      expect(re.ok).toBe(true);
      expect(rv.ok).toBe(true);
      // Pipeline materializes center O as a free point + the centerRadius circle.
      expect(intentSig(re)).toEqual(intentSig(rv));
      expect(intentSig(re)).toContain('circle:centerRadius:O:3');
    });

    it('triangle ABC with comma sub-clause splits + renders', () => {
      // "Triangle ABC, let M be the midpoint of BC" — comma-split lead word "let".
      const r = tryDeterministicFigure('Triangle ABC, let M be the midpoint of BC');
      expect(r.ok).toBe(true);
      expect(intentSig(r)).toEqual(
        ['point:M:midpoint:BC', 'shape:triangle:any:ABC'].sort(),
      );
    });
  });

  describe('escalate-safe EN cases', () => {
    it('unsupported EN construct (radical axis) → {ok:false}', () => {
      const r = tryDeterministicFigure('Draw the radical axis of two circles.');
      expect(r.ok).toBe(false);
    });

    it('EN geo-clause that no rule claims → {ok:false} incomplete/no-match', () => {
      // "Triangle ABC. The diameter of the circle is AB." — "diameter"/"circle"
      // make the 2nd clause geo, but no rule claims it → incomplete coverage.
      const r = tryDeterministicFigure(
        'Triangle ABC. The diameter of the circle is AB.',
      );
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(['incomplete-coverage', 'no-match']).toContain(r.reason);
      }
    });

    it('EN centroid with NO triangle anywhere → {ok:false} (fail-safe)', () => {
      // "centroid" makes the clause geo, but with no triangle to bind 'of' the
      // rule cannot resolve → no claim → escalate (never invent a triangle).
      const r = tryDeterministicFigure('G is the centroid.');
      expect(r.ok).toBe(false);
    });
  });
});
