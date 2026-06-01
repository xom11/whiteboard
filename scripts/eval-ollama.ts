// scripts/eval-ollama.ts
//
// Manual eval: chạy 12 đề THCS/lớp 10 qua Ollama provider, so sánh accuracy
// (% transpile_ok + dùng primitive đúng).
//
// Usage:
//   npx tsx scripts/eval-ollama.ts gemma3:4b
//   npx tsx scripts/eval-ollama.ts gemma3:12b
//   OLLAMA_BASE_URL=http://other:11434 npx tsx scripts/eval-ollama.ts gemma3:12b

import { generateFigure, OllamaProvider } from '../src/stamps/geometry-2d/ai';

interface Problem {
  id: string;
  text: string;
  /** Primitive kind kỳ vọng AI dùng (heuristic accuracy check). */
  expectKinds?: string[];
  /**
   * Tên shape kỳ vọng có trong DSL output (vd "AH" cho đường cao). Verify
   * đoạn cevian visible được dựng. User-facing concern: kind có nhưng segment
   * thiếu = vẽ ra điểm lơ lửng, không thấy đường.
   */
  expectShapeNames?: string[];
  /** Đề ngoài phạm vi → kỳ vọng refuse. */
  expectRefuse?: boolean;
}

const PROBLEMS: Problem[] = [
  // Tam giác cơ bản
  { id: 'tri-basic', text: 'Tam giác ABC.' },
  { id: 'tri-eq',    text: 'Tam giác đều ABC cạnh 4.' },
  { id: 'tri-right', text: 'Tam giác ABC vuông tại A.' },

  // Trung điểm / đường cao / phân giác (cần dùng derived primitives)
  { id: 'mid',       text: 'Tam giác ABC, M là trung điểm BC, vẽ đoạn AM.', expectKinds: ['midpoint'] },
  { id: 'altitude',  text: 'Tam giác ABC, H là chân đường cao kẻ từ A xuống BC.', expectKinds: ['perpFoot'] },
  { id: 'bisector',  text: 'Tam giác ABC, AD là phân giác góc A (D thuộc BC).', expectKinds: ['angleBisector'] },

  // Real-world phrasing (user feedback: cần đoạn cevian visible)
  { id: 'alt-named', text: 'Cho tam giác ABC, hạ đường cao AH.',  expectKinds: ['perpFoot'],      expectShapeNames: ['AH'] },
  { id: 'med-named', text: 'Cho tam giác ABC, AM là trung tuyến.', expectKinds: ['midpoint'],     expectShapeNames: ['AM'] },
  { id: 'bis-named', text: 'Cho tam giác ABC, vẽ phân giác AD.',   expectKinds: ['angleBisector'], expectShapeNames: ['AD'] },

  // Tâm tam giác (Tier E)
  { id: 'centroid',  text: 'Tam giác ABC, G là trọng tâm.', expectKinds: ['centroid'] },
  { id: 'circum',    text: 'Tam giác ABC nội tiếp đường tròn tâm O.', expectKinds: ['circumcenter'] },
  { id: 'incircle',  text: 'Đường tròn nội tiếp tam giác ABC, tâm I.', expectKinds: ['incenter'] },

  // Tứ giác + giao điểm
  { id: 'paragram',  text: 'Hình bình hành ABCD, hai đường chéo AC, BD cắt nhau tại O.', expectKinds: ['intersection'] },

  // Đường tròn qua 3 điểm
  { id: 'circle3',   text: 'Đường tròn đi qua 3 điểm A, B, C.', expectKinds: ['circle3'] },

  // Ngoài phạm vi
  { id: 'refuse-trig', text: 'Tính giá trị sin(30°) + cos(60°), không vẽ hình.', expectRefuse: true },
];

interface Result {
  id: string;
  ok: boolean;
  ms: number;
  reason?: string;
  pointKinds?: string[];
  shapeKinds?: string[];
  dsl?: unknown;
  message?: string;
}

async function run(model: string) {
  const provider = new OllamaProvider();
  const results: Result[] = [];

  console.log(`\n=== Eval Ollama: ${model} ===\n`);

  for (const p of PROBLEMS) {
    process.stdout.write(`[${p.id}] ${p.text.slice(0, 60)}... `);
    const t0 = Date.now();
    try {
      const r = await generateFigure(p.text, {
        provider,
        model,
        maxTokens: 4096,
        retryOnValidatorMiss: true,
      });
      const ms = Date.now() - t0;
      if (r.ok) {
        const pk = r.dsl.points.map((x) => x.kind);
        const sk = r.dsl.shapes.map((x) => x.kind);
        results.push({ id: p.id, ok: true, ms, pointKinds: pk, shapeKinds: sk, dsl: r.dsl });
        const expected = p.expectKinds ?? [];
        const allKinds = [...pk, ...sk];
        const missingExpected = expected.filter((k) => !allKinds.includes(k));
        const shapeNames = new Set(r.dsl.shapes.map((s) => s.name));
        const missingShapes = (p.expectShapeNames ?? []).filter(
          (n) => !shapeNames.has(n),
        );
        if (p.expectRefuse) {
          console.log(`✗ built (đáng lẽ refuse) ${ms}ms ${pk.length}P+${sk.length}S`);
        } else if (missingExpected.length > 0) {
          console.log(`△ ok ${ms}ms ${pk.length}P+${sk.length}S — thiếu kind: ${missingExpected.join(', ')}`);
        } else if (missingShapes.length > 0) {
          console.log(`△ ok ${ms}ms ${pk.length}P+${sk.length}S — thiếu shape name: ${missingShapes.join(', ')}`);
        } else {
          console.log(`✓ ${ms}ms ${pk.length}P+${sk.length}S`);
        }
      } else {
        results.push({ id: p.id, ok: false, ms, reason: r.reason, message: r.message });
        if (p.expectRefuse) {
          console.log(`✓ refuse ${ms}ms [${r.reason}]`);
        } else {
          console.log(`✗ ${ms}ms [${r.reason}] ${r.message.slice(0, 80)}`);
        }
      }
    } catch (e) {
      const ms = Date.now() - t0;
      console.log(`✗ ${ms}ms exception: ${(e as Error).message}`);
      results.push({ id: p.id, ok: false, ms, reason: 'exception', message: (e as Error).message });
    }
  }

  // Summary
  const transpileOk = results.filter((r) => r.ok).length;
  const total = results.length;
  const expectedRefuseSet = new Set(PROBLEMS.filter((p) => p.expectRefuse).map((p) => p.id));
  const correctRefuses = results.filter((r) => !r.ok && expectedRefuseSet.has(r.id) && r.reason === 'refused').length;
  const wrongBuilds = results.filter((r) => r.ok && expectedRefuseSet.has(r.id)).length;

  const kindAccuracy = (() => {
    const expected = PROBLEMS.filter((p) => !p.expectRefuse && p.expectKinds);
    let hit = 0;
    for (const p of expected) {
      const r = results.find((x) => x.id === p.id);
      if (!r || !r.ok) continue;
      const allKinds = [...(r.pointKinds ?? []), ...(r.shapeKinds ?? [])];
      const expectedKinds = p.expectKinds ?? [];
      if (expectedKinds.every((k) => allKinds.includes(k))) hit++;
    }
    return { hit, total: expected.length };
  })();

  const avgMs = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  console.log(`\n--- Summary (${model}) ---`);
  console.log(`Transpile OK : ${transpileOk}/${total} (${Math.round((transpileOk / total) * 100)}%)`);
  console.log(`Correct refuse: ${correctRefuses}/${expectedRefuseSet.size}`);
  console.log(`Wrong build  : ${wrongBuilds}/${expectedRefuseSet.size}`);
  console.log(`Kind accuracy: ${kindAccuracy.hit}/${kindAccuracy.total} (đề có expectKinds)`);
  console.log(`Avg latency  : ${avgMs}ms`);

  return results;
}

const model = process.argv[2] || 'gemma3:4b';
run(model).catch((e) => {
  console.error(e);
  process.exit(1);
});
