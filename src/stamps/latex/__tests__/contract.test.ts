// src/stamps/latex/__tests__/contract.test.ts
// Áp dụng generic StampType contract suite (B½.2 — issue #29).
import { runStampContract } from '../../shared/__tests__/stamp-contract';
import { latexStamp } from '../index';
import type { LatexCustomData } from '../types';

// katex ESM dynamic import → mock thẳng để renderLatexToSvg deterministic.
jest.mock('katex', () => ({
  __esModule: true,
  default: {
    renderToString: (src: string) => `<span class="katex">${src}</span>`,
  },
}));

const validCustomData: LatexCustomData = {
  kind: 'latex',
  version: 1,
  src: 'a + b',
  displayMode: false,
};

runStampContract(latexStamp, {
  validCustomData,
  sampleElement: {
    id: 'el-1',
    fileId: 'file-latex-1',
    customData: validCustomData,
  },
  extraInvalid: [
    { kind: 'latex', version: 1 }, // thiếu src
    { kind: 'latex', version: 99, src: 'x' }, // version sai
    { kind: 'latex', version: 1, src: 42 }, // src không phải string
  ],
});
