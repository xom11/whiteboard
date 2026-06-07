// scripts/check-construct-matrix.ts
//
// Capability matrix machine-check (Phase 6a, #45).
//
// Introspect 4 registry → verify CONSTRUCT_MANIFEST khớp registry thật:
//   1. Mọi DSL kind trong KIND_REGISTRY phải có entry trong manifest
//      (bắt "thêm DSL kind nhưng quên manifest").
//   2. Mỗi entry: intentKey/toolKey/ruleId khai báo phải resolve được trong
//      registry tương ứng (bắt key sai/lệch tên).
//   3. evalFixture (nếu non-null) phải tồn tại trên đĩa.
//
// TOOL_MODULES import-safe dưới `npx tsx` (đã probe Phase 6a — registry chỉ pull
// type + finalize fn, value import `objKind` từ tools không kéo React/CSS runtime).
//
// Chạy: `npm run check:matrix`. exit≠0 nếu có ERROR.

import { KIND_REGISTRY } from '../src/stamps/geometry-2d/dsl/registry';
import { OP_BUILDERS } from '../src/stamps/geometry-2d/ai/intent-builders/registry';
import { ADD_POINT_BUILDERS } from '../src/stamps/geometry-2d/ai/intent-builders/add-point';
import { TOOL_MODULES } from '../src/stamps/geometry-2d/editor/handlers/finalize/registry';
import { ALL_RULES } from '../src/stamps/geometry-2d/ai/rules/registry';
import { CONSTRUCT_MANIFEST } from './construct-matrix/manifest';
import { existsSync } from 'node:fs';

const intentKeys = new Set([...Object.keys(OP_BUILDERS), ...Object.keys(ADD_POINT_BUILDERS)]);
const ruleIds = new Set(ALL_RULES.map((r) => r.id));
const errors: string[] = [];
const warnings: string[] = [];

// 1. Mọi DSL kind phải có entry (bắt "thêm DSL kind quên manifest").
const manifestKinds = new Set(CONSTRUCT_MANIFEST.map((e) => e.dslKind));
for (const k of KIND_REGISTRY.keys()) {
  if (!manifestKinds.has(k)) errors.push(`DSL kind '${k}' thiếu entry trong manifest`);
}
// 2. Mỗi entry: key khai báo phải resolve trong registry tương ứng.
for (const e of CONSTRUCT_MANIFEST) {
  if (!KIND_REGISTRY.has(e.dslKind)) errors.push(`'${e.dslKind}': dslKind không có trong KIND_REGISTRY`);
  if (e.intentKey && !intentKeys.has(e.intentKey)) errors.push(`'${e.dslKind}': intentKey '${e.intentKey}' không có builder`);
  if (e.toolKey && !TOOL_MODULES.has(e.toolKey)) errors.push(`'${e.dslKind}': toolKey '${e.toolKey}' không có module`);
  if (e.ruleId && !ruleIds.has(e.ruleId)) errors.push(`'${e.dslKind}': ruleId '${e.ruleId}' không có rule`);
  if (!e.intentKey) warnings.push(`'${e.dslKind}': không có path Intent (chỉ manual/escalate)`);
  if (!e.toolKey) warnings.push(`'${e.dslKind}': không có manual tool`);
  if (!e.ruleId) warnings.push(`'${e.dslKind}': không có rule deterministic`);
  if (e.evalFixture && !existsSync(e.evalFixture)) errors.push(`'${e.dslKind}': evalFixture '${e.evalFixture}' không tồn tại`);
}

// 3. In bảng.
const col = (s: string, w: number) => (s + ' '.repeat(w)).slice(0, w);
console.log(col('DSL kind', 22) + col('scene', 10) + col('intent', 18) + col('tool', 18) + col('rule', 16) + 'ser');
for (const e of CONSTRUCT_MANIFEST) {
  console.log(
    col(e.dslKind, 22) +
      col(e.sceneKind, 10) +
      col(e.intentKey ?? '—', 18) +
      col(e.toolKey ?? '—', 18) +
      col(e.ruleId ?? '—', 16) +
      (e.serialize ? '✓' : '✗'),
  );
}
if (warnings.length) { console.log('\nWARN:'); warnings.forEach((w) => console.log('  ⚠ ' + w)); }
if (errors.length) { console.error('\nERRORS:'); errors.forEach((er) => console.error('  ✗ ' + er)); process.exit(1); }
console.log(`\n✓ Matrix OK — ${CONSTRUCT_MANIFEST.length} construct, ${KIND_REGISTRY.size} DSL kind.`);
