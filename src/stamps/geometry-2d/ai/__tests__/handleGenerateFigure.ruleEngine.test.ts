// handleGenerateFigure phải đi qua RULE ENGINE (tryDeterministicFigure) cho
// construct — deterministic-only, KHÔNG LLM. Regression cho bug "playground gọi
// handleGenerateFigure nên rule engine không bao giờ chạy".
import { handleGenerateFigure } from '../handleGenerateFigure';

const PROBLEM =
  'Cho đường tròn (O) và ba dây cung AB, AC, AD bất kì. ' +
  'Các đường tròn đường kính AB, AC, AD đôi một cắt nhau lần thứ hai tại M, N, P.';

describe('handleGenerateFigure — rule engine fast path (deterministic)', () => {
  it('đề "đường tròn đường kính đôi một cắt nhau" → deterministic', async () => {
    const seen: string[] = [];
    const r = await handleGenerateFigure(
      { problem: PROBLEM },
      { onResult: (res) => { if (res.ok) seen.push(res.provider); } },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // State có 8 điểm (O,A,B,C,D,M,N,P).
    const points = Object.values(r.state.objects).filter((o: any) => o.kind === 'point');
    expect(points).toHaveLength(8);
    expect(seen).toContain('deterministic');
  });

  it('cùng đề với newline + thụt lề giữa câu (như user dán) vẫn deterministic', async () => {
    const withNewline =
      'Cho đường tròn (O) và ba dây cung AB, AC, AD bất kì. ' +
      'Các đường tròn đường kính AB, AC, AD\n  đôi một cắt nhau lần thứ hai tại M, N, P';
    const r = await handleGenerateFigure({ problem: withNewline });
    expect(r.ok).toBe(true);
  });
});
