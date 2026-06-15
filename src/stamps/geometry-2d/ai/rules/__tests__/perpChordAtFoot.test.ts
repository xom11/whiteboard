import { perpChordAtFootRule } from '../perpChordAtFoot';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return perpChordAtFootRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents as any[]);
}

describe('perpChordAtFootRule', () => {
  // httcd:53 — "Dây" HOA đầu câu (sau dấu '.') phải khớp; dây ⊥ OA (collinear
  // đường kính AB) tại H đã có → nhánh B (rightAngleViewing + reflectLine).
  it('"Dây CD vuông góc với OA tại H" (Dây HOA, ⊥ bán kính collinear đường kính)', () => {
    const all = intents('Cho đường tròn tâm O đường kính AB. Gọi H là trung điểm OA. Dây CD vuông góc với OA tại H.');
    expect(all.find((i) => i.name === 'C')?.constraint.kind).toBe('rightAngleViewing');
    expect(all.find((i) => i.name === 'D')?.constraint.kind).toBe('reflectLine');
  });

  // GIỮ NGUYÊN: "Kẻ dây DE ⊥ AB tại H" (verb dẫn, thường) — nhánh B đường kính AB.
  it('"Kẻ dây CD ⊥ AB tại H" vẫn hoạt động (regression)', () => {
    const all = intents('Cho (O;R) đường kính AB. Điểm H thuộc OA. Kẻ dây CD ⊥ AB tại H.');
    expect(all.find((i) => i.name === 'C')).toBeDefined();
    expect(all.find((i) => i.name === 'D')).toBeDefined();
  });
});
