// scripts/debug-dsl.ts
//
// Debug OLD DSL pipeline (handleGenerateFigure) - dùng cho demo flow hiện tại.

import { handleGenerateFigure } from '../src/stamps/geometry-2d/ai/handleGenerateFigure';
import { ClaudeCliProvider } from '../src/stamps/geometry-2d/ai/providers';

async function main() {
  const problem = process.argv[2] || 'Tam giác ABC vuông tại A, AH là đường cao xuống BC';
  const provider = new ClaudeCliProvider({ defaultModel: 'claude-sonnet-4-6' });

  console.log(`Problem: ${problem}\n`);
  const r = await handleGenerateFigure(
    { problem },
    { provider, model: 'claude-sonnet-4-6' },
  );

  if (!r.ok) {
    console.log('FAIL:', r);
    return;
  }
  console.log('OK. State elements:');
  console.log(JSON.stringify(r.state, null, 2));
}

main().catch(console.error);
