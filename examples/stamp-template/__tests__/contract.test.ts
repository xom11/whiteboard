// examples/stamp-template/__tests__/contract.test.ts
// Smoke-test template stamp pass contract suite ngay khi copy. Khi bạn fork
// template, đổi import path tương ứng (`../../src/...` → `../../shared/...`).
import { runStampContract } from '../../../src/stamps/shared/__tests__/stamp-contract';
import { colorSwatchStamp } from '../index';
import type { ColorSwatchCustomData } from '../types';

const validCustomData: ColorSwatchCustomData = {
  kind: 'color-swatch',
  version: 1,
  color: '#ff8800',
};

runStampContract(colorSwatchStamp, {
  validCustomData,
  sampleElement: {
    id: 'el-1',
    fileId: 'file-color-swatch-1',
    customData: validCustomData,
  },
  extraInvalid: [
    { kind: 'color-swatch', version: 1 }, // thiếu color
    { kind: 'color-swatch', version: 99, color: '#000' }, // version sai
    { kind: 'color-swatch', version: 1, color: 42 }, // color không phải string
  ],
});
