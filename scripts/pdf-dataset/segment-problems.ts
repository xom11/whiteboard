// scripts/pdf-dataset/segment-problems.ts
//
// Cắt ĐỀ BÀI (chỉ statement, bỏ lời giải + hình) từ OCR per-page (all.json).
// Cấu trúc sách "Tổng hợp HHP vào 10 2018-2019":
//   Chương 1 (p7-12): Bổ đề — BỎ.
//   Chương 2 (p13-114): 100 bài, đề = đoạn prose NGAY TRƯỚC "Lời giải" (không header).
//   Chương 3 (p115-116) + Chương 4 (p117-119): "Bài N." đề thuần, split theo header.
//
//   npx tsx scripts/pdf-dataset/segment-problems.ts <ocrDir> [--write <outFile>]
//
// Output (--write): file .txt với mỗi đề là "Câu N: <statement>" (khớp blockParse
// của diag-all). In stats + sample khi không --write.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repairOcrSymbols } from '../../src/stamps/geometry-2d/ai/vision/repairOcrSymbols';

interface Page { page: string; text: string; confidence: number }

// Opener YẾU (fallback) — bất kỳ câu mở đầu nào.
const STMT_START = /(Cho |Từ điểm |Từ một điểm |Gọi |Trên |Cho đường tròn|Cho tam giác|Cho hình|Cho nửa)/;
// Opener MẠNH = mở đầu ĐỀ thật ("Cho <hình>" / "Từ (một) điểm"). Chương 2 không có
// header → đề = đoạn trước "Lời giải" gồm [tail lời giải bài trước] + [đề]. Lấy từ
// opener MẠNH CUỐI để KHÔNG cắt nhầm ở "Gọi/Trên" giữa đề (mất "Cho tam giác ABC…").
const STRONG_START =
  /Cho\s+(?:tam giác|tứ giác|đường tròn|nửa đường tròn|nửa|hình|hai|ba|bốn|góc|đoạn|điểm|\(|\d)|Từ\s+(?:điểm|một điểm)/g;

// Chèn '\n' trước các mốc cấu trúc đề (ý a)/b), số 1,/2,, động từ kết luận) để
// đề DỄ ĐỌC thay vì 1 dòng dài. KHÔNG đổi nội dung — chỉ thay 1 dấu cách = '\n'.
// An toàn với pipeline: diag-all blockParse join lại bằng '\n' + introBeforeProof
// cắt tại chính các mốc này (phần dựng hình = trước "Chứng minh/Tính/a)" giữ
// nguyên); compare.py render '\n'→<br>. (Verify diag-all 0 regression.)
function insertBreaks(t: string): string {
  // ý chữ thường "a)/a," (sub-question) — nhãn 1 ký tự a-d + )/, theo sau dấu cách
  t = t.replace(/\s+([a-d][),])(?=\s)/g, '\n$1');
  // ý số "1,/1./2," THEO SAU chữ HOA/Đ (né số trong công thức "= 2BD", toạ độ)
  t = t.replace(/\s+([1-9][.,])(?=\s+[A-ZĐ])/g, '\n$1');
  // động từ mệnh đề kết luận / yêu cầu
  t = t.replace(/\s+(Chứng minh|Chứng tỏ|CMR|Tính|Tìm|Xác định)/g, '\n$1');
  return t.replace(/\n{2,}/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

// production postProcess (rút gọn — collapse + NFC + repairOcrSymbols) + xuống dòng
function clean(raw: string): string {
  let t = raw.trim();
  t = t.replace(/\s+/g, ' ').trim();
  t = t.normalize('NFC');
  t = repairOcrSymbols(t);
  t = insertBreaks(t);
  return t;
}

function pageNum(p: string): number {
  return parseInt(p.replace(/[^\d]/g, ''), 10);
}

// Bỏ header chạy trang + dòng số trang lẻ.
function stripHeaders(text: string): string {
  return text
    .split('\n')
    .filter((ln) => {
      const s = ln.trim();
      if (/^Tạ Công Hoàng\s*-\s*Nguyễn Đăng Khoa/.test(s)) return false;
      if (/^\d{1,3}$/.test(s)) return false;
      return true;
    })
    .join('\n');
}

function main() {
  const ocrDir = process.argv[2];
  const writeIdx = process.argv.indexOf('--write');
  const outFile = writeIdx >= 0 ? process.argv[writeIdx + 1] : null;
  if (!ocrDir) { console.error('usage: tsx segment-problems.ts <ocrDir> [--write <out>]'); process.exit(1); }

  const pages = JSON.parse(readFileSync(resolve(ocrDir, 'all.json'), 'utf-8')) as Page[];
  const byNum = new Map<number, string>();
  for (const p of pages) byNum.set(pageNum(p.page), stripHeaders(p.text));

  const problems: Array<{ id: string; chapter: number; statement: string }> = [];

  // ---- Chương 2: p13-114, đề = prose trước "Lời giải" ----
  let ch2 = '';
  for (let n = 13; n <= 114; n++) ch2 += '\n' + (byNum.get(n) ?? '');
  // Tách theo "Lời giải" (OCR variant: Lời giải / Loi giai / Lời giải:)
  const loiGiaiRe = /(Lời giải|Lời giải:|Loi giai|Lời gải)/g;
  const chunks = ch2.split(loiGiaiRe).filter((c) => !loiGiaiRe.test(c) || true);
  // split giữ delimiter → lọc: lấy các đoạn KHÔNG phải chính delimiter
  const segs = ch2.split(/Lời giải|Loi giai|Lời gải/);
  let ch2count = 0;
  for (let i = 0; i < segs.length - 1; i++) {
    // đoạn segs[i] = [tail lời giải bài trước] + [đề bài i]. Lấy từ opener MẠNH cuối
    // ("Cho tam giác…"/"Từ điểm…") → giữ trọn đề; fallback opener yếu nếu không có.
    const blk = segs[i];
    const strong = [...blk.matchAll(STRONG_START)];
    let start: number;
    if (strong.length > 0) {
      start = strong[strong.length - 1].index ?? 0;
    } else {
      const weak = [...blk.matchAll(new RegExp(STMT_START.source, 'g'))];
      if (weak.length === 0) continue;
      start = weak[weak.length - 1].index ?? 0;
    }
    let stmt = clean(blk.slice(start));
    // cắt đuôi nếu lỡ nuốt (giữ tới hết câu hỏi)
    if (stmt.length < 25) continue;
    if (stmt.length > 700) stmt = stmt.slice(0, 700);
    ch2count++;
    problems.push({ id: `ch2-${String(ch2count).padStart(3, '0')}`, chapter: 2, statement: stmt });
  }

  // ---- Chương 3+4: p115-119, split theo "Bài N." ----
  let ch34 = '';
  for (let n = 115; n <= 119; n++) ch34 += '\n' + (byNum.get(n) ?? '');
  const baiSplit = ch34.split(/(?=Bài\s*\d+\s*\.)/);
  for (const blk of baiSplit) {
    const m = blk.match(/^Bài\s*(\d+)\s*\./);
    if (!m) continue;
    let stmt = clean(blk);
    if (stmt.length < 25) continue;
    if (stmt.length > 700) stmt = stmt.slice(0, 700);
    const chap = parseInt(m[1], 10) >= 100 ? 3 : 4;
    problems.push({ id: `ch${chap}-bai${m[1]}`, chapter: chap, statement: stmt });
  }

  console.log(`Tổng đề cắt được: ${problems.length} (Ch2=${problems.filter((p) => p.chapter === 2).length}, Ch3=${problems.filter((p) => p.chapter === 3).length}, Ch4=${problems.filter((p) => p.chapter === 4).length})`);
  console.log('\n=== SAMPLE Ch2 (5 đầu) ===');
  for (const p of problems.filter((p) => p.chapter === 2).slice(0, 5)) console.log(`[${p.id}] ${p.statement}\n`);
  console.log('=== SAMPLE Ch4 (3 đầu) ===');
  for (const p of problems.filter((p) => p.chapter === 4).slice(0, 3)) console.log(`[${p.id}] ${p.statement}\n`);

  if (outFile) {
    const lines = problems.map((p, i) => `Câu ${i + 1}: ${p.statement}`).join('\n\n');
    writeFileSync(outFile, lines + '\n', 'utf-8');
    console.log(`\nWROTE ${problems.length} đề → ${outFile}`);
  }
}

main();
