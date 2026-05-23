// src/stamps/graph-2d/__tests__/contract.test.ts
// Áp dụng generic StampType contract suite (B½.2 — issue #29).
import { runStampContract } from '../../shared/__tests__/stamp-contract';
import { graph2dStamp } from '../index';
import { createEmptyState } from '../../../core/scene';
import type { Graph2DCustomData } from '../types';

const validJsonState = JSON.stringify(createEmptyState('graph2d'));

const validCustomData: Graph2DCustomData = {
  kind: 'graph2d',
  version: 2,
  jsonState: validJsonState,
};

runStampContract(graph2dStamp, {
  validCustomData,
  sampleElement: {
    id: 'el-graph-1',
    fileId: 'file-graph2d-1',
    customData: validCustomData,
  },
  extraInvalid: [
    { kind: 'graph2d', version: 2 }, // thiếu jsonState
    { kind: 'graph2d', version: 1, jsonState: '{}' }, // v1 format cũ
    { kind: 'graph2d', version: 2, jsonState: 42 }, // jsonState không phải string
  ],
});
