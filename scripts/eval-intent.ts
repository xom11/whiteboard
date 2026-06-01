// scripts/eval-intent.ts
//
// Eval suite cho Intent pipeline (pipeline mới). So sánh extracted intents vs
// golden `expectedIntents` để đo 3 trục đủ/đúng/không thừa.
//
// Usage:
//   npx tsx scripts/eval-intent.ts gemma3:4b
//   npx tsx scripts/eval-intent.ts gemma3:12b
//   OLLAMA_BASE_URL=http://other:11434 npx tsx scripts/eval-intent.ts gemma3:12b

import {
  generateFigureIntent,
  type IntentT,
} from '../src/stamps/geometry-2d/ai';
import { compareIntents } from '../src/stamps/geometry-2d/ai/verify';

interface Problem {
  id: string;
  tier: 0 | 1 | 2 | 3 | 'R';
  text: string;
  expectedIntents: IntentT[]; // empty array = refuse expected
}

const PROBLEMS: Problem[] = [
  // ===== Tier 0 — single shape, no augmentation (10) =====
  {
    id: 't0-tri-any', tier: 0, text: 'Tam giác ABC.',
    expectedIntents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' }],
  },
  {
    id: 't0-tri-eq', tier: 0, text: 'Tam giác đều ABC.',
    expectedIntents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'equilateral' }],
  },
  {
    id: 't0-tri-right-A', tier: 0, text: 'Tam giác ABC vuông tại A.',
    expectedIntents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-A' }],
  },
  {
    id: 't0-tri-right-B', tier: 0, text: 'Tam giác ABC vuông tại B.',
    expectedIntents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-B' }],
  },
  {
    id: 't0-tri-iso', tier: 0, text: 'Tam giác ABC cân tại A.',
    expectedIntents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'isoceles-BC' }],
  },
  {
    id: 't0-square', tier: 0, text: 'Hình vuông MNPQ.',
    expectedIntents: [{ op: 'draw-shape', shape: 'square', labels: ['M', 'N', 'P', 'Q'], variant: 'standard' }],
  },
  {
    id: 't0-rect', tier: 0, text: 'Hình chữ nhật ABCD.',
    expectedIntents: [{ op: 'draw-shape', shape: 'rectangle', labels: ['A', 'B', 'C', 'D'], variant: 'standard' }],
  },
  {
    id: 't0-rhom', tier: 0, text: 'Hình thoi ABCD.',
    expectedIntents: [{ op: 'draw-shape', shape: 'rhombus', labels: ['A', 'B', 'C', 'D'], variant: 'standard' }],
  },
  {
    id: 't0-para', tier: 0, text: 'Hình bình hành ABCD.',
    expectedIntents: [{ op: 'draw-shape', shape: 'parallelogram', labels: ['A', 'B', 'C', 'D'], variant: 'standard' }],
  },
  {
    id: 't0-trap', tier: 0, text: 'Hình thang cân ABCD.',
    expectedIntents: [{ op: 'draw-shape', shape: 'trapezoid', labels: ['A', 'B', 'C', 'D'], variant: 'isoceles' }],
  },

  // ===== Tier 1 — shape + 1 augmentation (10) =====
  {
    id: 't1-mid', tier: 1, text: 'Tam giác ABC, M là trung điểm BC.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
    ],
  },
  {
    id: 't1-mid-AM', tier: 1, text: 'Tam giác ABC, M là trung điểm BC, vẽ đoạn AM.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'connect', from: 'A', to: 'M', style: 'segment' },
    ],
  },
  {
    id: 't1-altitude', tier: 1, text: 'Tam giác ABC, H là chân đường cao từ A xuống BC.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
    ],
  },
  {
    id: 't1-centroid', tier: 1, text: 'Tam giác ABC, G là trọng tâm.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'G', constraint: { kind: 'centroid', of: ['A', 'B', 'C'] } },
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
    id: 't1-incenter', tier: 1, text: 'Tam giác ABC, I là tâm đường tròn nội tiếp.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'I', constraint: { kind: 'incenter', of: ['A', 'B', 'C'] } },
    ],
  },
  {
    id: 't1-ortho', tier: 1, text: 'Tam giác ABC, trực tâm H.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'orthocenter', of: ['A', 'B', 'C'] } },
    ],
  },
  {
    id: 't1-circle3', tier: 1, text: 'Đường tròn (O) đi qua 3 điểm A, B, C.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
    ],
  },
  {
    id: 't1-rect-diag', tier: 1, text: 'Hình chữ nhật ABCD, vẽ đường chéo AC.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'rectangle', labels: ['A', 'B', 'C', 'D'], variant: 'standard' },
      { op: 'connect', from: 'A', to: 'C', style: 'segment' },
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

  // ===== Tier 3 — English variants (8) =====
  {
    id: 't3-tri-any-en', tier: 3, text: 'Triangle ABC.',
    expectedIntents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' }],
  },
  {
    id: 't3-tri-eq-en', tier: 3, text: 'Equilateral triangle ABC.',
    expectedIntents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'equilateral' }],
  },
  {
    id: 't3-tri-right-en', tier: 3, text: 'Right triangle ABC with the right angle at A.',
    expectedIntents: [{ op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-A' }],
  },
  {
    id: 't3-mid-en', tier: 3, text: 'Triangle ABC, M is the midpoint of BC.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
    ],
  },
  {
    id: 't3-square-en', tier: 3, text: 'Square MNPQ.',
    expectedIntents: [{ op: 'draw-shape', shape: 'square', labels: ['M', 'N', 'P', 'Q'], variant: 'standard' }],
  },
  {
    id: 't3-altitude-en', tier: 3, text: 'In triangle ABC, H is the foot of the altitude from A to BC.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
    ],
  },
  {
    id: 't3-centroid-en', tier: 3, text: 'Let G be the centroid of triangle ABC.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'G', constraint: { kind: 'centroid', of: ['A', 'B', 'C'] } },
    ],
  },
  {
    id: 't3-circum-en', tier: 3, text: 'Triangle ABC inscribed in circle O.',
    expectedIntents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
    ],
  },

  // ===== Refuse =====
  {
    id: 'r-trig', tier: 'R', text: 'Tính sin(30°) + cos(60°).',
    expectedIntents: [],
  },
  {
    id: 'r-cat', tier: 'R', text: 'Vẽ con mèo.',
    expectedIntents: [],
  },
];

interface RunResult {
  id: string;
  tier: Problem['tier'];
  text: string;
  ok: boolean;
  ms: number;
  reason: string;
  intents?: readonly IntentT[];
  missing: number;
  wrong: number;
  extra: number;
  exactMatch: boolean;
}

async function runOne(model: string, p: Problem): Promise<RunResult> {
  const start = Date.now();
  const r = await generateFigureIntent(p.text, { ollamaDefaultModel: model });
  const ms = Date.now() - start;

  if (!r.ok) {
    const expectsRefuse = p.expectedIntents.length === 0;
    const correctRefuse = expectsRefuse && r.reason === 'refused';
    return {
      id: p.id,
      tier: p.tier,
      text: p.text,
      ok: correctRefuse,
      ms,
      reason: r.reason,
      missing: 0, wrong: 0, extra: 0,
      exactMatch: correctRefuse,
    };
  }

  const expectsRefuse = p.expectedIntents.length === 0;
  if (expectsRefuse) {
    // Should have refused but built
    return {
      id: p.id,
      tier: p.tier,
      text: p.text,
      ok: false,
      ms,
      reason: 'wrong_build',
      intents: r.intents,
      missing: 0, wrong: 0, extra: r.intents.length,
      exactMatch: false,
    };
  }

  const cmp = compareIntents(p.expectedIntents, r.intents);
  return {
    id: p.id,
    tier: p.tier,
    text: p.text,
    ok: cmp.ok,
    ms,
    reason: cmp.ok ? 'ok' : 'mismatch',
    intents: r.intents,
    missing: cmp.missing.length,
    wrong: cmp.wrong.length,
    extra: cmp.extra.length,
    exactMatch: cmp.ok,
  };
}

async function run(model: string) {
  console.log(`\n=== Eval Intent Pipeline: ${model} ===\n`);
  const results: RunResult[] = [];
  for (const p of PROBLEMS) {
    process.stdout.write(`[${p.id}] (T${p.tier}) ${p.text.slice(0, 60)}... `);
    try {
      const r = await runOne(model, p);
      results.push(r);
      const mark = r.ok ? '✓' : '✗';
      const sub =
        r.reason === 'ok'
          ? ''
          : ` (${r.reason}; -${r.missing}/!${r.wrong}/+${r.extra})`;
      console.log(`${mark} ${r.ms}ms${sub}`);
    } catch (e) {
      console.log(`✗ EXCEPTION: ${(e as Error).message}`);
      results.push({
        id: p.id,
        tier: p.tier,
        text: p.text,
        ok: false,
        ms: 0,
        reason: 'exception',
        missing: 0, wrong: 0, extra: 0,
        exactMatch: false,
      });
    }
  }

  // Summary
  console.log('\n--- Summary per tier ---');
  const tiers = [0, 1, 2, 3, 'R'] as const;
  for (const t of tiers) {
    const inTier = results.filter((r) => r.tier === t);
    if (inTier.length === 0) continue;
    const ok = inTier.filter((r) => r.ok).length;
    const exact = inTier.filter((r) => r.exactMatch).length;
    const totalMissing = inTier.reduce((s, r) => s + r.missing, 0);
    const totalWrong = inTier.reduce((s, r) => s + r.wrong, 0);
    const totalExtra = inTier.reduce((s, r) => s + r.extra, 0);
    console.log(
      `Tier ${t}: ok=${ok}/${inTier.length} exact=${exact}/${inTier.length}  ` +
      `total: missing=${totalMissing} wrong=${totalWrong} extra=${totalExtra}`,
    );
  }
  const okTotal = results.filter((r) => r.ok).length;
  const exactTotal = results.filter((r) => r.exactMatch).length;
  const avgMs = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  console.log(
    `\nTotal: ok=${okTotal}/${results.length} (${Math.round(100 * okTotal / results.length)}%) ` +
    `exact=${exactTotal}/${results.length} (${Math.round(100 * exactTotal / results.length)}%) ` +
    `avg=${avgMs}ms`,
  );

  // 3-axis aggregate (đủ/đúng/không thừa)
  const buildableResults = results.filter((r) => r.tier !== 'R');
  const totalIntents = buildableResults.reduce((s, r) => s + r.missing, 0)
                     + buildableResults.reduce((s, r) => s + (r.intents?.length ?? 0), 0);
  // Use simpler: tổng số entries trong expected
  let totalExpected = 0;
  for (const r of buildableResults) {
    const p = PROBLEMS.find((x) => x.id === r.id)!;
    totalExpected += p.expectedIntents.length;
  }
  const totalMissingAll = buildableResults.reduce((s, r) => s + r.missing, 0);
  const totalWrongAll = buildableResults.reduce((s, r) => s + r.wrong, 0);
  const totalExtraAll = buildableResults.reduce((s, r) => s + r.extra, 0);
  console.log('\n--- 3-axis (buildable only) ---');
  console.log(`Đủ        : ${totalExpected - totalMissingAll}/${totalExpected} (${pct(totalExpected - totalMissingAll, totalExpected)})`);
  console.log(`Đúng     : ${totalExpected - totalWrongAll}/${totalExpected} (${pct(totalExpected - totalWrongAll, totalExpected)})`);
  console.log(`Không thừa: missing-extras=${totalExtraAll} (lower = better; ideal = 0)`);

  return results;
}

function pct(part: number, total: number) {
  if (total === 0) return '0%';
  return `${Math.round(100 * part / total)}%`;
}

const model = process.argv[2] || 'gemma3:4b';
run(model).catch((e) => {
  console.error(e);
  process.exit(1);
});
