// scripts/pdf-dataset/ocr-pages.ts
//
// Batch OCR mọi trang PNG (đã rasterize sẵn bằng pymupdf) bằng MỘT worker
// Tesseract 'vie+eng' (dùng lại, không terminate mỗi trang → nhanh hơn nhiều so
// với production extractProblemFromImage). GIỮ NGUYÊN raw text (có newline) để
// segment đề bài; repairOcrSymbols sẽ áp ở bước cắt đề (trên text đã collapse).
//
//   npx tsx scripts/pdf-dataset/ocr-pages.ts <pagesDir> <outDir>
//
// Output: <outDir>/p###.txt (raw) + <outDir>/all.json [{page, text, confidence}]

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

async function main() {
  const pagesDir = process.argv[2];
  const outDir = process.argv[3];
  if (!pagesDir || !outDir) {
    console.error('usage: tsx ocr-pages.ts <pagesDir> <outDir>');
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(pagesDir).filter((f) => f.endsWith('.png')).sort();
  console.log(`OCR ${files.length} pages from ${pagesDir}`);

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('vie+eng');

  const all: Array<{ page: string; text: string; confidence: number }> = [];
  const t0 = Date.now();
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const path = join(pagesDir, f);
    const { data } = await worker.recognize(path);
    const page = f.replace(/\.png$/, '');
    writeFileSync(resolve(outDir, `${page}.txt`), data.text, 'utf-8');
    all.push({ page, text: data.text, confidence: data.confidence });
    const el = ((Date.now() - t0) / 1000).toFixed(0);
    process.stdout.write(`\r  ${i + 1}/${files.length} (${page}, conf=${Math.round(data.confidence)}, ${el}s)   `);
  }
  await worker.terminate();
  writeFileSync(resolve(outDir, 'all.json'), JSON.stringify(all, null, 2), 'utf-8');
  console.log(`\nDONE → ${outDir}/all.json (${all.length} pages, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
