import { inferMediaType, validateFile, MAX_RAW_BYTES, MAX_EDGE_PX } from '../preprocess';

describe('preprocess.inferMediaType', () => {
  it('returns image/png for png file', () => {
    const f = new File([new Uint8Array([0x89, 0x50])], 'a.png', { type: 'image/png' });
    expect(inferMediaType(f)).toBe('image/png');
  });

  it('returns image/jpeg for jpg file', () => {
    const f = new File([new Uint8Array([0xff, 0xd8])], 'a.jpg', { type: 'image/jpeg' });
    expect(inferMediaType(f)).toBe('image/jpeg');
  });

  it('returns image/webp for webp', () => {
    const f = new File([new Uint8Array([])], 'a.webp', { type: 'image/webp' });
    expect(inferMediaType(f)).toBe('image/webp');
  });

  it('returns null for unsupported type (heic)', () => {
    const f = new File([new Uint8Array([])], 'a.heic', { type: 'image/heic' });
    expect(inferMediaType(f)).toBeNull();
  });

  it('returns null for non-image (pdf) — PDF KHÔNG phải input OCR', () => {
    const f = new File([new Uint8Array([])], 'a.pdf', { type: 'application/pdf' });
    expect(inferMediaType(f)).toBeNull();
  });
});

describe('preprocess.validateFile', () => {
  it('accepts valid png under size limit', () => {
    const f = new File([new Uint8Array(1024)], 'a.png', { type: 'image/png' });
    expect(validateFile(f)).toEqual({ ok: true, mediaType: 'image/png' });
  });

  it('rejects unsupported format', () => {
    const f = new File([new Uint8Array(100)], 'a.heic', { type: 'image/heic' });
    const r = validateFile(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('invalid-format');
  });

  it('rejects file > MAX_RAW_BYTES', () => {
    const big = new File([new Uint8Array(MAX_RAW_BYTES + 1)], 'big.png', { type: 'image/png' });
    const r = validateFile(big);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('too-large');
  });
});

describe('preprocess constants', () => {
  it('MAX_EDGE_PX = 2048', () => {
    expect(MAX_EDGE_PX).toBe(2048);
  });
  it('MAX_RAW_BYTES = 10 MB', () => {
    expect(MAX_RAW_BYTES).toBe(10 * 1024 * 1024);
  });
});
