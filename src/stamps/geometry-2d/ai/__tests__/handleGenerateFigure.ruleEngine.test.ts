// handleGenerateFigure phải đi qua RULE ENGINE (Track A1, tryDeterministicFigure)
// cho construct mới — KHÔNG rơi xuống LLM. Regression cho bug "playground gọi
// handleGenerateFigure nên rule engine không bao giờ chạy".
import { handleGenerateFigure } from '../handleGenerateFigure';
import type { AIProvider } from '../providers';

// Provider NÉM nếu bị gọi — chứng minh Track A1 trả về TRƯỚC khi tới LLM.
const throwingProvider: AIProvider = {
  name: 'should-not-be-called',
  defaultModel: 'x',
  async call() {
    throw new Error('LLM KHÔNG được gọi — phải dựng deterministic qua rule engine');
  },
};

const PROBLEM =
  'Cho đường tròn (O) và ba dây cung AB, AC, AD bất kì. ' +
  'Các đường tròn đường kính AB, AC, AD đôi một cắt nhau lần thứ hai tại M, N, P.';

describe('handleGenerateFigure — rule engine fast path (Track A1)', () => {
  it('đề "đường tròn đường kính đôi một cắt nhau" → deterministic, KHÔNG gọi LLM', async () => {
    const seen: string[] = [];
    const r = await handleGenerateFigure(
      { problem: PROBLEM },
      { provider: throwingProvider, onResult: (res) => { if (res.ok) seen.push(res.provider); } },
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
    const r = await handleGenerateFigure({ problem: withNewline }, { provider: throwingProvider });
    expect(r.ok).toBe(true);
  });
});
