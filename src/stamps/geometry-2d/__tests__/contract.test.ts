// src/stamps/geometry-2d/__tests__/contract.test.ts
// Áp dụng generic StampType contract suite (B½.2 — issue #29).
import { runStampContract } from '../../shared/__tests__/stamp-contract';
import { geometryStamp } from '../index';
import { createEmptyState } from '../../../core/scene';
import type { GeometryCustomData } from '../types';

const validJsonState = JSON.stringify({
  version: 2,
  bbox: [-5, 5, 5, -5] as [number, number, number, number],
  state: createEmptyState('2d'),
  showAxis: false,
  showGrid: false,
});

const validCustomData: GeometryCustomData = {
  kind: 'geometry',
  version: 1,
  jsonState: validJsonState,
  svgWidth: 400,
  svgHeight: 300,
};

runStampContract(geometryStamp, {
  validCustomData,
  sampleElement: {
    id: 'el-1',
    fileId: 'file-geometry-1',
    customData: validCustomData,
  },
  extraInvalid: [
    { kind: 'geometry', version: 1 }, // thiếu jsonState
    { kind: 'geometry', version: 99, jsonState: '{}' }, // version sai
    { kind: 'geometry', version: 1, jsonState: 42 }, // jsonState không phải string
  ],
});
