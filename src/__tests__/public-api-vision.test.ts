describe('@xom11/whiteboard public API — vision', () => {
  it('exports handleExtractProblem từ root', async () => {
    const mod = await import('../index');
    expect(typeof (mod as { handleExtractProblem?: unknown }).handleExtractProblem).toBe('function');
  });

  it('exports ImagePart + ExtractUiResult types', () => {
    // Type-level test: ensure types compile when imported.
    type _Test = {
      img: import('../index').ImagePart;
      res: import('../index').ExtractUiResult;
    };
    expect(true).toBe(true);
  });
});
