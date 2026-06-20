import { perpNamedLineRule } from '../perpNamedLine';
import { segmentClauses } from '../../deterministic/coverage';

function intents(problem: string) {
  return perpNamedLineRule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m) => m.intents as any[]);
}

describe('perpNamedLineRule', () => {
  // vao10:11 — "Từ A kẻ Ax ⊥ MN tại K": đường ĐẶT TÊN Ax (gốc A) ⊥ MN, chân K.
  it('"Từ A kẻ Ax ⊥ MN tại K" → line Ax perpThrough(A,MN) + K perpFoot(A,MN)', () => {
    const all = intents('Cho (O) đường kính AB. Dây MN. Từ A kẻ Ax ⊥ MN tại K.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'Ax', kind: 'perpThrough', through: 'A', to: 'MN' });
    expect(all).toContainEqual({ op: 'add-point', name: 'K', constraint: { kind: 'perpFoot', from: 'A', onLine: 'MN' } });
  });

  it('"Vẽ đường thẳng Od ⊥ OA tại O" → line Od; KHÔNG foot mới (O ∈ OA)', () => {
    const all = intents('Cho (O;R). Vẽ đường thẳng Od ⊥ OA tại O.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'Od', kind: 'perpThrough', through: 'O', to: 'OA' });
    expect(all.find((i) => i.op === 'add-point')).toBeUndefined();
  });

  it('"Kẻ Ax ⊥ MN" (không "tại K") → chỉ line Ax', () => {
    const all = intents('Từ A kẻ Ax ⊥ MN.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'Ax', kind: 'perpThrough', through: 'A', to: 'MN' });
    expect(all.find((i) => i.op === 'add-point')).toBeUndefined();
  });

  // vao10:11 thật — OCR dính "Ax⊥MN" (không space quanh ⊥).
  it('"Từ A kẻ Ax⊥MN tại K" (OCR dính ⊥) → line Ax + K', () => {
    const all = intents('Cho (O) đường kính AB. Dây MN. Từ A kẻ Ax⊥MN tại K.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'Ax', kind: 'perpThrough', through: 'A', to: 'MN' });
    expect(all).toContainEqual({ op: 'add-point', name: 'K', constraint: { kind: 'perpFoot', from: 'A', onLine: 'MN' } });
  });

  it('không match khi token không phải dạng <HOA><thường> (vd "AB ⊥ MN")', () => {
    expect(intents('Kẻ AB ⊥ MN tại K')).toEqual([]);
  });

  // vao10:206 — "Từ A kẻ tia Ax ⊥ MN, cắt MN tại K": tiền tố "tia" + "cắt MN" xen
  // giữa ⊥ và "tại K" (chân K nằm trên MN, không phải đầu mút).
  it('"Từ A kẻ tia Ax ⊥ MN, cắt MN tại K" → line Ax + K perpFoot(A,MN)', () => {
    const all = intents('Cho (O) đường kính AB. Từ A kẻ tia Ax ⊥ MN, cắt MN tại K.');
    expect(all).toContainEqual({ op: 'draw-line', name: 'Ax', kind: 'perpThrough', through: 'A', to: 'MN' });
    expect(all).toContainEqual({ op: 'add-point', name: 'K', constraint: { kind: 'perpFoot', from: 'A', onLine: 'MN' } });
  });
});
