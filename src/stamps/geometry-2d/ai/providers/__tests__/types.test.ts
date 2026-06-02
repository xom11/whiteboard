import type { AIProvider, ImagePart, VisionRequest } from '../types';

describe('provider types — vision extension', () => {
  it('ImagePart shape: mediaType + base64 strings', () => {
    const img: ImagePart = { mediaType: 'image/png', base64: 'abc' };
    expect(img.mediaType).toBe('image/png');
    expect(img.base64).toBe('abc');
  });

  it('VisionRequest shape: includes images array + optional model', () => {
    const req: VisionRequest = {
      systemPrompt: 's',
      userPrompt: 'u',
      schema: { type: 'object' },
      images: [{ mediaType: 'image/jpeg', base64: 'b64' }],
      maxTokens: 100,
    };
    expect(req.images).toHaveLength(1);
    expect(req.model).toBeUndefined();
  });

  it('AIProvider.extractText is optional (provider can omit)', () => {
    const provider: AIProvider = {
      name: 'mock',
      defaultModel: 'm',
      call: async () => ({ kind: 'error', message: 'noop' }),
      // extractText omitted intentionally
    };
    expect(provider.extractText).toBeUndefined();
  });

  it('AIProvider with extractText satisfies interface', () => {
    const provider: AIProvider = {
      name: 'mock',
      defaultModel: 'm',
      call: async () => ({ kind: 'error', message: 'noop' }),
      extractText: async () => ({ kind: 'error', message: 'noop' }),
    };
    expect(typeof provider.extractText).toBe('function');
  });
});
