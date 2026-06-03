// scripts/debug-transpile.ts
//
// Capture full pipeline output (intents + error message) cho 2 problem fail
// transpile_error trong smoke Sonnet. Goal: tìm root cause — Claude sinh DSL
// invalid hay pipeline có bug.

import { generateFigureIntent } from '../src/stamps/geometry-2d/ai';
import { ClaudeCliProvider } from '../src/stamps/geometry-2d/ai/providers';

const PROBLEMS = [
  {
    id: 't4-tangent-ext',
    text: 'Cho (O; R=3) và điểm A ngoài (O), OA=5. Từ A vẽ 2 tiếp tuyến AB, AC tới (O) (B, C là tiếp điểm). Vẽ BC. Gọi H là giao của OA và BC.',
  },
  {
    id: 't5-incircle-circumcircle-arc',
    text: 'Cho tam giác ABC nội tiếp (O), (I) là đường tròn nội tiếp tiếp xúc BC tại D. Đường thẳng AI cắt (O) tại M ≠ A. Vẽ MD, MO.',
  },
];

async function main() {
  const model = process.argv[2] || 'claude-sonnet-4-6';
  const provider = new ClaudeCliProvider({ defaultModel: model });

  for (const p of PROBLEMS) {
    console.log(`\n=== ${p.id} ===`);
    console.log(`Problem: ${p.text}`);
    const r = await generateFigureIntent(p.text, { provider, model });

    console.log(`\nResult: ok=${r.ok}, reason=${r.ok ? 'success' : r.reason}`);

    if ('intents' in r && r.intents) {
      console.log(`\nIntents from Claude (n=${r.intents.length}):`);
      for (const i of r.intents) {
        console.log('  ' + JSON.stringify(i));
      }
    }

    if (!r.ok) {
      console.log(`\nError message:\n  ${r.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
