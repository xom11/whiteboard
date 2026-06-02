#!/usr/bin/env tsx
// scripts/eval-vision.ts
//
// Eval OCR vision pipeline trên 10 fixture ảnh.
// Usage:
//   npx tsx scripts/eval-vision.ts gemma3:4b
//   npx tsx scripts/eval-vision.ts gemma3:12b
//   npx tsx scripts/eval-vision.ts claude-opus-4-7
//
// Output: F1 character-level + recall ký hiệu toán + refusal accuracy.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { handleExtractProblem } from '../src/stamps/geometry-2d/ai/handleExtractProblem';
import type { ImagePart } from '../src/stamps/geometry-2d/ai/providers/types';

interface Fixture {
  imagePath: string;
  expected: { text: string; expectRefuse?: boolean };
}

const MATH_SYMBOLS = ['Δ', '⊥', '∥', '°', '⊙'];

async function loadFixtures(dir: string): Promise<Fixture[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: Fixture[] = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!/\.(png|jpe?g|webp)$/i.test(e.name)) continue;
    const base = e.name.replace(/\.[^.]+$/, '');
    const expectedPath = path.join(dir, `${base}.expected.json`);
    try {
      const expected = JSON.parse(await fs.readFile(expectedPath, 'utf8'));
      out.push({ imagePath: path.join(dir, e.name), expected });
    } catch {
      console.warn(`⚠️  Missing ${expectedPath} — skipping`);
    }
  }
  return out;
}

async function imageToPart(imagePath: string): Promise<ImagePart> {
  const data = await fs.readFile(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mediaType =
    ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return { mediaType, base64: data.toString('base64') };
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').normalize('NFC').toLowerCase();
}

function charF1(a: string, b: string): number {
  const A = new Set(normalize(a).split(''));
  const B = new Set(normalize(b).split(''));
  const inter = [...A].filter((c) => B.has(c)).length;
  if (inter === 0) return 0;
  const precision = inter / B.size;
  const recall = inter / A.size;
  return (2 * precision * recall) / (precision + recall);
}

function symbolRecall(actual: string, expected: string): number {
  const expectedSyms = MATH_SYMBOLS.filter((s) => expected.includes(s));
  if (expectedSyms.length === 0) return 1;
  const hit = expectedSyms.filter((s) => actual.includes(s)).length;
  return hit / expectedSyms.length;
}

async function main() {
  const model = process.argv[2];
  if (!model) {
    console.error('Usage: npx tsx scripts/eval-vision.ts <model>');
    process.exit(1);
  }
  const fixtureDir = path.join(process.cwd(), 'scripts', 'vision-fixtures');
  const fixtures = await loadFixtures(fixtureDir);
  if (fixtures.length === 0) {
    console.error(`Không tìm thấy fixture trong ${fixtureDir}.`);
    process.exit(1);
  }

  console.log(`📷 Eval vision OCR — model=${model}, n=${fixtures.length}`);
  const results: { name: string; f1: number; symRecall: number; refused: boolean; expectRefuse: boolean }[] = [];

  for (const f of fixtures) {
    const img = await imageToPart(f.imagePath);
    const r = await handleExtractProblem(img, { visionModel: model });
    const name = path.basename(f.imagePath);
    if (f.expected.expectRefuse) {
      const refused = r.kind === 'refused';
      results.push({ name, f1: 0, symRecall: 0, refused, expectRefuse: true });
      console.log(`  ${refused ? '✅' : '❌'} ${name} — expected refuse, got ${r.kind}`);
      continue;
    }
    if (r.kind !== 'success' && r.kind !== 'low-confidence') {
      results.push({ name, f1: 0, symRecall: 0, refused: false, expectRefuse: false });
      console.log(`  ❌ ${name} — ${r.kind}: ${'message' in r ? r.message : 'no text'}`);
      continue;
    }
    const f1 = charF1(f.expected.text, r.text);
    const sym = symbolRecall(r.text, f.expected.text);
    results.push({ name, f1, symRecall: sym, refused: false, expectRefuse: false });
    console.log(`  ${f1 >= 0.8 ? '✅' : '⚠️ '} ${name} — F1=${f1.toFixed(3)} sym=${sym.toFixed(2)}`);
  }

  const extractResults = results.filter((r) => !r.expectRefuse);
  const refuseResults = results.filter((r) => r.expectRefuse);
  const avgF1 = extractResults.reduce((s, r) => s + r.f1, 0) / Math.max(extractResults.length, 1);
  const avgSym = extractResults.reduce((s, r) => s + r.symRecall, 0) / Math.max(extractResults.length, 1);
  const refusalAcc = refuseResults.length === 0
    ? 1
    : refuseResults.filter((r) => r.refused).length / refuseResults.length;

  console.log(`\n📊 Summary model=${model}`);
  console.log(`   F1 trung bình:        ${avgF1.toFixed(3)}`);
  console.log(`   Symbol recall:        ${avgSym.toFixed(3)}`);
  console.log(`   Refusal accuracy:     ${refusalAcc.toFixed(3)} (${refuseResults.length} control)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
