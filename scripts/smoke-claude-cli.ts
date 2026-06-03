// scripts/smoke-claude-cli.ts
//
// Smoke test ClaudeCliProvider end-to-end qua façade handleGenerateFigureIntent.
// Pick 14 problem đại diện từ Tier 0-5 + Refuse → đánh giá quality so với baseline
// Gemma 12B F1=0.737 (xem [[project-ai-tier45-eval]]).
//
// Pipeline đầy đủ: CLI subprocess → JSON envelope → validator + deterministic
// completion → intentToDsl → verifyGeometry → SVG render.
//
// Usage:
//   npx tsx scripts/smoke-claude-cli.ts                       # default sonnet
//   npx tsx scripts/smoke-claude-cli.ts claude-haiku-4-5      # rẻ hơn
//   npx tsx scripts/smoke-claude-cli.ts claude-opus-4-7
//
// Cost charge vào quota Max subscription (không tiền túi). Smoke 14 problem
// Sonnet ≈ $0.5-1 (so với quota 50M tokens/tháng).

import { handleGenerateFigureIntent } from '../src/stamps/geometry-2d/ai';
import { ClaudeCliProvider } from '../src/stamps/geometry-2d/ai/providers';
import { compareIntents, computeIntentMetrics } from '../src/stamps/geometry-2d/ai/verify';
import type { IntentT } from '../src/stamps/geometry-2d/ai/intent';

interface Problem {
  id: string;
  tier: 0 | 1 | 2 | 3 | 4 | 5 | 'R';
  text: string;
  expectedIntents: IntentT[]; // empty array = refuse expected
}

// 14 problem đại diện (lấy từ scripts/eval-intent.ts).
const PROBLEMS: Problem[] = [
  // ===== Tier 0 (3) =====
  {
    id: 't0-tri-eq', tier: 0, text: 'Tam giác đều ABC.',
    expectedIntents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'equilateral' }],
  },
  {
    id: 't0-tri-right-A', tier: 0, text: 'Tam giác ABC vuông tại A.',
    expectedIntents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-A' }],
  },
  {
    id: 't0-trap', tier: 0, text: 'Hình thang cân ABCD.',
    expectedIntents: [{ op: 'draw-shape', shape: 'trapezoid', labels: ['A', 'B', 'C', 'D'], variant: 'isoceles' }],
  },

  // ===== Tier 1 (3) =====
  {
    id: 't1-mid-AM', tier: 1, text: 'Tam giác ABC, M là trung điểm BC, vẽ đoạn AM.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'connect', from: 'A', to: 'M', style: 'segment' },
    ],
  },
  {
    id: 't1-circum', tier: 1, text: 'Tam giác ABC, O là tâm đường tròn ngoại tiếp.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'O', constraint: { kind: 'circumcenter', of: ['A', 'B', 'C'] } },
    ],
  },
  {
    id: 't1-para-diags', tier: 1, text: 'Hình bình hành ABCD, hai đường chéo AC và BD cắt nhau tại O.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'parallelogram', labels: ['A', 'B', 'C', 'D'], variant: 'standard' },
      { op: 'connect', from: 'A', to: 'C', style: 'segment' },
      { op: 'connect', from: 'B', to: 'D', style: 'segment' },
      { op: 'add-point', name: 'O', constraint: { kind: 'intersection', of: ['AC', 'BD'] } },
    ],
  },

  // ===== Tier 3 (English) (2) =====
  {
    id: 't3-mid-en', tier: 3, text: 'Triangle ABC, M is the midpoint of BC.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
    ],
  },
  {
    id: 't3-altitude-en', tier: 3, text: 'In triangle ABC, H is the foot of the altitude from A to BC.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      // DSL convention: "đường cao AH" = perpFoot + segment compound.
      { op: 'connect', from: 'A', to: 'H', style: 'segment' },
    ],
  },

  // ===== Tier 4 (vào 10 thường) (3) =====
  {
    id: 't4-perpbis-circumcenter', tier: 4, text: 'Cho tam giác ABC. Đường trung trực AB và AC cắt nhau tại O.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'connect', from: 'A', to: 'B', style: 'perpBisector' },
      { op: 'connect', from: 'A', to: 'C', style: 'perpBisector' },
      { op: 'add-point', name: 'O', constraint: { kind: 'circumcenter', of: ['A', 'B', 'C'] } },
    ],
  },
  {
    id: 't4-tangent-ext', tier: 4, text: 'Cho (O; R=3) và điểm A ngoài (O), OA=5. Từ A vẽ 2 tiếp tuyến AB, AC tới (O) (B, C là tiếp điểm). Vẽ BC. Gọi H là giao của OA và BC.',
    expectedIntents: [
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3 },
      { op: 'add-point', name: 'A', constraint: { kind: 'free', at: [5, 0] } },
      { op: 'draw-line', name: 'tBC', kind: 'tangentFromExt', from: 'A', circle: 'O', which: 'both' },
      { op: 'add-point', name: 'B', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 0 } },
      { op: 'add-point', name: 'C', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 1 } },
      { op: 'connect', from: 'B', to: 'C', style: 'segment' },
      { op: 'add-point', name: 'H', constraint: { kind: 'intersection', of: ['OA', 'BC'] } },
    ],
  },
  {
    id: 't4-ortho-mark', tier: 4, text: 'Cho tam giác ABC nhọn. Đường cao AD, BE, CF cắt tại H. Vẽ tam giác DEF.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'D', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'perpFoot', from: 'B', onLine: 'AC' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'perpFoot', from: 'C', onLine: 'AB' } },
      // DSL convention: "đường cao AD/BE/CF" = perpFoot + segment compound (mỗi đường cao).
      { op: 'connect', from: 'A', to: 'D', style: 'segment' },
      { op: 'connect', from: 'B', to: 'E', style: 'segment' },
      { op: 'connect', from: 'C', to: 'F', style: 'segment' },
      { op: 'add-point', name: 'H', constraint: { kind: 'intersection', of: ['AD', 'BE'] } },
      { op: 'mark-shape', shape: 'triangle', labels: ['D', 'E', 'F'] },
    ],
  },

  // ===== Tier 5 (vào 10 chuyên) (2) =====
  {
    id: 't5-altitude-circle', tier: 5, text: 'Cho tam giác ABC vuông tại A, đường cao AH (H∈BC). Đường tròn tâm A bán kính AH cắt AB tại P, cắt AC tại Q. M là trung điểm PQ. AM kéo dài cắt BC tại N.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-A' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'connect', from: 'A', to: 'H', style: 'segment' },
      { op: 'draw-circle', name: 'cA', spec: 'centerThrough', center: 'A', through: 'H' },
      { op: 'add-point', name: 'P', constraint: { kind: 'secondIntersection', line: 'AB', circle: 'cA', other: 'A' } },
      { op: 'add-point', name: 'Q', constraint: { kind: 'secondIntersection', line: 'AC', circle: 'cA', other: 'A' } },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'PQ' } },
      { op: 'connect', from: 'A', to: 'M', style: 'line' },
      { op: 'add-point', name: 'N', constraint: { kind: 'intersection', of: ['AM', 'BC'] } },
    ],
  },
  {
    id: 't5-incircle-circumcircle-arc', tier: 5, text: 'Cho tam giác ABC nội tiếp (O), (I) là đường tròn nội tiếp tiếp xúc BC tại D. Đường thẳng AI cắt (O) tại M ≠ A. Vẽ MD, MO.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A', 'B', 'C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' } },
      { op: 'add-point', name: 'M', constraint: { kind: 'secondIntersection', line: 'AI', circle: 'O', other: 'A' } },
      { op: 'connect', from: 'M', to: 'D', style: 'segment' },
      { op: 'connect', from: 'M', to: 'O', style: 'segment' },
    ],
  },

  // ===== Refuse (1) =====
  {
    id: 'r-cat', tier: 'R', text: 'Vẽ con mèo.',
    expectedIntents: [],
  },
];

// Pricing per 1M tokens (2026-06 Anthropic public). Sonnet/Opus/Haiku.
const PRICING: Record<string, { in: number; out: number; cacheRead: number; cacheCreate: number }> = {
  'claude-haiku-4-5': { in: 1, out: 5, cacheRead: 0.1, cacheCreate: 1.25 },
  'claude-sonnet-4-6': { in: 3, out: 15, cacheRead: 0.3, cacheCreate: 3.75 },
  'claude-opus-4-7': { in: 15, out: 75, cacheRead: 1.5, cacheCreate: 18.75 },
};

function estimateCost(model: string, u: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheCreationTokens?: number }) {
  const p = PRICING[model];
  if (!p) return 0;
  return (
    (u.inputTokens * p.in
      + u.outputTokens * p.out
      + (u.cacheReadTokens ?? 0) * p.cacheRead
      + (u.cacheCreationTokens ?? 0) * p.cacheCreate)
    / 1_000_000
  );
}

async function main() {
  const model = process.argv[2] || 'claude-sonnet-4-6';
  const provider = new ClaudeCliProvider({ defaultModel: model });

  console.log(`=== Smoke ClaudeCliProvider (model=${model}, n=${PROBLEMS.length}) ===\n`);

  const results: Array<{
    id: string; tier: 0 | 1 | 2 | 3 | 4 | 5 | 'R'; ok: boolean; exact: boolean;
    ms: number; cost: number;
    recall: number; precision: number; f1: number;
    reason: string;
  }> = [];
  let totalCost = 0;
  let totalMs = 0;

  for (const p of PROBLEMS) {
    process.stdout.write(`[${p.id}] (T${p.tier}) `);
    const start = Date.now();
    const r = await handleGenerateFigureIntent(p.text, { provider, model });
    const ms = Date.now() - start;
    totalMs += ms;

    // Refuse case
    if (p.expectedIntents.length === 0) {
      const correctRefuse = r.kind === 'refused';
      const cost = r.kind === 'success'
        ? estimateCost(model, r.usage)
        : 0;
      totalCost += cost;
      console.log(correctRefuse
        ? `✓ correctly refused ${ms}ms`
        : `✗ should refuse but got kind=${r.kind} ${ms}ms`);
      results.push({
        id: p.id, tier: p.tier, ok: correctRefuse, exact: correctRefuse,
        ms, cost, recall: 0, precision: 0, f1: 0,
        reason: correctRefuse ? 'ok' : 'wrong-build',
      });
      continue;
    }

    if (r.kind !== 'success') {
      console.log(`✗ ${r.kind} (${'code' in r ? r.code : 'n/a'})`);
      results.push({
        id: p.id, tier: p.tier, ok: false, exact: false,
        ms, cost: 0, recall: 0, precision: 0, f1: 0,
        reason: r.kind,
      });
      continue;
    }

    const cmp = compareIntents(p.expectedIntents, r.intents as IntentT[]);
    const m = computeIntentMetrics(p.expectedIntents as never, r.intents as never);
    const cost = estimateCost(model, r.usage);
    totalCost += cost;

    const mark = cmp.ok ? '✓' : '⚠';
    console.log(
      `${mark} ${ms}ms  intents=${r.intents.length} ` +
      `(miss=${cmp.missing.length} wrong=${cmp.wrong.length} extra=${cmp.extra.length})  ` +
      `R=${(m.recall * 100).toFixed(0)}% P=${(m.precision * 100).toFixed(0)}% F1=${(m.f1 * 100).toFixed(0)}%  ` +
      `$${cost.toFixed(4)}`,
    );
    if (!cmp.ok && cmp.wrong.length > 0) {
      for (const w of cmp.wrong) {
        console.log(`     wrong: expected ${JSON.stringify(w.expected)} got ${JSON.stringify(w.got)}`);
      }
    }
    if (!cmp.ok && cmp.missing.length > 0) {
      console.log(`     missing: ${cmp.missing.map((m) => JSON.stringify(m)).join(', ')}`);
    }
    if (!cmp.ok && cmp.extra.length > 0) {
      console.log(`     extra: ${cmp.extra.map((m) => JSON.stringify(m)).join(', ')}`);
    }

    results.push({
      id: p.id, tier: p.tier,
      ok: cmp.ok, exact: cmp.ok,
      ms, cost,
      recall: m.recall, precision: m.precision, f1: m.f1,
      reason: cmp.ok ? 'ok' : 'mismatch',
    });
  }

  // Summary
  console.log('\n--- Summary per tier ---');
  const tiers: Array<0 | 1 | 2 | 3 | 4 | 5 | 'R'> = [0, 1, 2, 3, 4, 5, 'R'];
  for (const t of tiers) {
    const inTier = results.filter((r) => r.tier === t);
    if (inTier.length === 0) continue;
    const ok = inTier.filter((r) => r.ok).length;
    console.log(`Tier ${t}: ok=${ok}/${inTier.length}`);
  }

  const okTotal = results.filter((r) => r.ok).length;
  const buildable = results.filter((r) => r.tier !== 'R' && r.reason !== 'wrong-build');
  const avgRecall = buildable.reduce((s, r) => s + r.recall, 0) / Math.max(1, buildable.length);
  const avgPrec = buildable.reduce((s, r) => s + r.precision, 0) / Math.max(1, buildable.length);
  const avgF1 = (avgRecall + avgPrec) === 0 ? 0 : (2 * avgRecall * avgPrec) / (avgRecall + avgPrec);

  console.log(`\n--- Total ---`);
  console.log(`OK exact:    ${okTotal}/${results.length} (${Math.round(100 * okTotal / results.length)}%)`);
  console.log(`Avg Recall:  ${(avgRecall * 100).toFixed(1)}%`);
  console.log(`Avg Precision: ${(avgPrec * 100).toFixed(1)}%`);
  console.log(`Avg F1:      ${(avgF1 * 100).toFixed(1)}%  (baseline Gemma 12B = 73.7%)`);
  console.log(`Total time:  ${(totalMs / 1000).toFixed(1)}s  avg ${Math.round(totalMs / results.length)}ms/call`);
  console.log(`Total cost:  $${totalCost.toFixed(3)}  (charge vào Max quota, không tiền túi)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
