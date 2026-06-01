import { generateFigure, OllamaProvider } from '../src/stamps/geometry-2d/ai';

async function main() {
  const provider = new OllamaProvider();
  const problems = [
    'Tam giác ABC, M là trung điểm BC, vẽ AM.',
    'Tam giác đều ABC cạnh 4.',
    'Tam giác ABC vuông tại A, H là chân đường cao từ A.',
    'Đường tròn (O) đi qua A, B, C.',
  ];

  for (const p of problems) {
    const t0 = Date.now();
    const r = await generateFigure(p, { provider, maxTokens: 4096 });
    const ms = Date.now() - t0;
    if (r.ok) {
      const counts = `${r.dsl.points.length}P + ${r.dsl.shapes.length}S`;
      console.log(`✓ ${ms}ms ${counts}: ${p}`);
      console.log(`  DSL: ${JSON.stringify(r.dsl).slice(0, 250)}...`);
    } else {
      console.log(`✗ ${ms}ms [${r.reason}] ${p}`);
      console.log(`  msg: ${r.message.slice(0, 200)}`);
    }
  }
}

main().catch(console.error);
