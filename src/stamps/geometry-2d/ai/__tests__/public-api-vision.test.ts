describe('AI public API — vision exports', () => {
  it('exports handleExtractProblem + types', async () => {
    const mod = await import('../index');
    expect(typeof mod.handleExtractProblem).toBe('function');
  });

  it('exports VisionEnvelopeZ + visionEnvelopeJsonSchema', async () => {
    const mod = await import('../index');
    expect(mod.VisionEnvelopeZ).toBeDefined();
    expect(typeof mod.visionEnvelopeJsonSchema).toBe('function');
  });

  it('exports extractProblemFromImage from vision barrel', async () => {
    const mod = await import('../vision');
    expect(typeof mod.extractProblemFromImage).toBe('function');
    expect(typeof mod.pickVisionModel).toBe('function');
  });
});
