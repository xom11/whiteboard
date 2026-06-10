import { normalizeProblemText } from '../normalizeText';

describe('normalizeProblemText', () => {
  it('Δ/∆ trước chữ HOA → "tam giác "', () => {
    expect(normalizeProblemText('tâm nội tiếp ΔMAB')).toBe('tâm nội tiếp tam giác MAB');
    expect(normalizeProblemText('ΔABC ~ ΔASQ')).toBe('tam giác ABC ~ tam giác ASQ');
  });
  it('"vòng tròn" → "đường tròn" (mọi hoa/thường)', () => {
    expect(normalizeProblemText('I là tâm vòng tròn nội tiếp')).toBe('I là tâm đường tròn nội tiếp');
    expect(normalizeProblemText('Vòng tròn (O)')).toBe('đường tròn (O)');
  });
  it('idempotent + không đụng text khác', () => {
    const s = 'Cho tam giác ABC nội tiếp đường tròn (O)';
    expect(normalizeProblemText(s)).toBe(s);
  });
});
