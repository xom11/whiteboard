import { handleExtractProblem } from '../handleExtractProblem';
import type { AIProvider, ImagePart } from '../providers/types';

const sampleImage: ImagePart = { mediaType: 'image/png', base64: 'b64' };

function makeProvider(extractText: AIProvider['extractText']): AIProvider {
  return { name: 'mock', defaultModel: 'm', call: jest.fn(), extractText };
}

describe('handleExtractProblem', () => {
  it('success → kind=success với text', async () => {
    const provider = makeProvider(
      jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'extract', text: 'Cho tam giác ABC vuông tại A', confidence: 'high' },
        usage: { inputTokens: 50, outputTokens: 10 },
      }),
    );
    const r = await handleExtractProblem(sampleImage, { engine: 'llm', provider });
    expect(r.kind).toBe('success');
    if (r.kind === 'success') {
      expect(r.text).toBe('Cho tam giác ABC vuông tại A');
      expect(r.usage.inputTokens).toBe(50);
    }
  });

  it('low-confidence → kind=low-confidence + warning', async () => {
    const provider = makeProvider(
      jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'extract', text: 'short', confidence: 'low' },
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    );
    const r = await handleExtractProblem(sampleImage, { engine: 'llm', provider });
    expect(r.kind).toBe('low-confidence');
    if (r.kind === 'low-confidence') expect(r.warning).toMatch(/kiểm tra|không chính xác/i);
  });

  it('refuse → kind=refused not-math', async () => {
    const provider = makeProvider(
      jest.fn().mockResolvedValue({
        kind: 'json',
        data: { decision: 'refuse', reason: 'không phải đề toán' },
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    );
    const r = await handleExtractProblem(sampleImage, { engine: 'llm', provider });
    expect(r.kind).toBe('refused');
    if (r.kind === 'refused') expect(r.reason).toBe('not-math');
  });

  it('extractText undefined → kind=error code=unsupported', async () => {
    const provider: AIProvider = { name: 'mock', defaultModel: 'm', call: jest.fn() };
    const r = await handleExtractProblem(sampleImage, { engine: 'llm', provider });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.code).toBe('unsupported');
  });

  it('provider returns kind=error → kind=error code=network', async () => {
    const provider = makeProvider(jest.fn().mockResolvedValue({ kind: 'error', message: 'down' }));
    const r = await handleExtractProblem(sampleImage, { engine: 'llm', provider });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.code).toBe('network');
  });

  it('provider throws → kind=error code=unexpected', async () => {
    const provider = makeProvider(jest.fn().mockRejectedValue(new Error('boom')));
    const r = await handleExtractProblem(sampleImage, { engine: 'llm', provider });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.code).toBe('unexpected');
      expect(r.message).toContain('boom');
    }
  });
});
