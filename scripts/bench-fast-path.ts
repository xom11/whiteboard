// scripts/bench-fast-path.ts
//
// Đo latency của parseDeterministic trên đề mẫu × 5 lần → p50, p95 + hit rate.
// Usage: npx tsx scripts/bench-fast-path.ts

import { parseDeterministic } from '../src/stamps/geometry-2d/ai/deterministic';

const SAMPLES = [
  'Cho tam giác ABC',
  'Cho tam giác ABC vuông tại A',
  'tam giác đều ABC',
  'tam giác ABC cân tại A',
  'Cho tam giác ABC, đường cao AH',
  'Cho tam giác ABC, M là trung điểm BC',
  'Cho tam giác ABC, vẽ trung tuyến AM',
  'Cho tam giác ABC, phân giác AD',
  'tam giác ABC nội tiếp đường tròn (O)',
  'tam giác ABC, tâm I nội tiếp tam giác',
  'tam giác ABC, trọng tâm G',
  'tam giác ABC, trực tâm H',
  'Cho đường tròn (O; R=3)',
  'đường tròn tâm O bán kính 5',
  'Cho hình chữ nhật ABCD',
  'Cho hình vuông ABCD',
  'Cho hình bình hành ABCD',
  'tam giác ABC, đường cao AH, M trung điểm BC',
  'Từ A ngoài (O; R=3), kẻ 2 tiếp tuyến AB, AC (B, C là tiếp điểm)',
  'tam giác ABC, đường tròn ngoại tiếp tâm O',
];

const ITER = 5;

interface Sample {
  problem: string;
  durationsMs: number[];
  hit: boolean;
  confidence: number;
}

const results: Sample[] = SAMPLES.map((problem) => {
  const durations: number[] = [];
  let hit = false;
  let conf = 0;
  for (let i = 0; i < ITER; i++) {
    const t0 = performance.now();
    const r = parseDeterministic(problem);
    const t1 = performance.now();
    durations.push(t1 - t0);
    hit = r.ok;
    conf = r.confidence;
  }
  return { problem, durationsMs: durations, hit, confidence: conf };
});

const allDurations = results.flatMap((r) => r.durationsMs).sort((a, b) => a - b);
const p50 = allDurations[Math.floor(allDurations.length * 0.5)];
const p95 = allDurations[Math.floor(allDurations.length * 0.95)];
const hitRate = results.filter((r) => r.hit).length / results.length;

console.log(`\n=== bench-fast-path ===`);
console.log(`Samples: ${SAMPLES.length} × ${ITER} = ${allDurations.length} runs`);
console.log(`p50: ${p50.toFixed(3)}ms | p95: ${p95.toFixed(3)}ms`);
console.log(`Hit rate (confidence ≥ 0.75 default): ${(hitRate * 100).toFixed(1)}%`);
console.log();
for (const r of results) {
  const avg = r.durationsMs.reduce((a, b) => a + b, 0) / r.durationsMs.length;
  console.log(
    `${r.hit ? '✓' : '✗'} ${avg.toFixed(2)}ms (conf=${r.confidence.toFixed(2)}) — ${r.problem.slice(0, 60)}`,
  );
}
