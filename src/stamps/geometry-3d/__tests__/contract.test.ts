// src/stamps/geometry-3d/__tests__/contract.test.ts
// Áp dụng generic StampType contract suite (B½.2 — issue #29).
import { runStampContract } from '../../shared/__tests__/stamp-contract';
import { geometry3dStamp } from '../index';
import { createEmptyState } from '../../../core/scene';
import type { Geometry3DCustomData } from '../serialize';

const validJsonState = JSON.stringify({
  version: 2,
  state: createEmptyState('3d'),
});

const validCustomData: Geometry3DCustomData = {
  kind: 'geometry3d',
  version: 2,
  jsonState: validJsonState,
  svgWidth: 1024,
  svgHeight: 768,
};

runStampContract(geometry3dStamp, {
  validCustomData,
  sampleElement: {
    id: 'el-3d-1',
    fileId: 'file-geometry3d-1',
    customData: validCustomData,
  },
  extraInvalid: [
    { kind: 'geometry3d', version: 2 }, // thiếu jsonState
    { kind: 'geometry3d', version: 99, jsonState: '{}' }, // version 99 không support
    { kind: 'geometry3d', version: 2, jsonState: 42 }, // jsonState không phải string
  ],
});
