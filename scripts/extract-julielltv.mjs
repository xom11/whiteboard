// Crawl đề Hình học phẳng từ Huy Cao's Blog (julielltv.wordpress.com).
// Category page chứa full đề + lời giải inline; LaTeX mã hoá qua latex.php?latex=.
//
//   node scripts/extract-julielltv.mjs            # in summary (dry-run)
//   node scripts/extract-julielltv.mjs --write    # merge vào docs/datasets/julielltv-*
//
// Giữ nguyên các bài đã có (dedup theo URL) + append bài mới (id nối tiếp).
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'docs/datasets/julielltv-hinh-hoc-phang.json');
const MD_PATH = path.join(ROOT, 'docs/datasets/julielltv-hinh-hoc-phang.md');
const CATEGORY = 'https://julielltv.wordpress.com/category/hinh-hoc-phang/page/';

function get(url, redirects = 0) {
  return new Promise((res, rej) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && redirects < 5) {
          return get(r.headers.location, redirects + 1).then(res, rej);
        }
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => res({ status: r.statusCode, body: d }));
      })
      .on('error', rej);
  });
}

// latex.php?latex=<urlencoded>&bg=...  →  $<latex>$   ; gỡ thẻ HTML còn lại.
function decode(html) {
  return html
    .replace(/<img[^>]*?latex\.php\?latex=([^&"'\s]+)[^>]*>/gi, (_, l) => {
      try {
        return ' $' + decodeURIComponent(l.replace(/\+/g, ' ')) + '$ ';
      } catch {
        return ' $' + l.replace(/\+/g, ' ') + '$ ';
      }
    })
    .replace(/<br\s*\/?>(?=\S)/gi, ' ')
    .replace(/<\/?(p|div|li|h\d|ul|ol)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#0?38;|&amp;/g, '&')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;|&#8216;|&#8242;/g, "'")
    .replace(/\$\s+\$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tách 1 article block → {url, competition, statement, solution}.
function parseArticle(block) {
  const linkM = block.match(/class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"/i);
  const url = linkM ? linkM[1] : null;
  const cm = block.match(/<div class="entry-content"[^>]*>([\s\S]*?)<footer|<div class="entry-content"[^>]*>([\s\S]*?)<\/article/i);
  if (!url || !cm) return null;
  const rawContent = cm[1] ?? cm[2];
  const text = decode(rawContent);

  // ảnh HÌNH tác giả vẽ = <img> upload (wp-content/uploads | files.wordpress.com), KHÔNG phải latex.php
  const figures = [
    ...new Set(
      [...rawContent.matchAll(/<img[^>]*src="([^"]+)"/gi)]
        .map((m) => m[1].replace(/&#0?38;|&amp;/g, '&'))
        .filter((s) => !/latex\.php/.test(s) && /(wp-content\/uploads|files\.wordpress\.com)/.test(s))
        .map((s) => s.split('?')[0]) // bỏ query w/h
    ),
  ];

  // competition: "Bài toán (....)" hoặc "(....)" ngay đầu
  let competition = null;
  const compM = text.match(/^(?:Bài toán|Bài)\s*\(([^)]{3,120})\)/i);
  if (compM) competition = compM[1].trim();

  // bỏ tiền tố "Bài toán (...)" / "Bài toán."
  let body = text.replace(/^(?:Bài toán|Bài)\s*(?:\([^)]*\))?\s*[:.]?\s*/i, '');

  // tách lời giải
  const solM = body.match(/\b(Lời giải|Hướng dẫn|Chứng minh\.)\s*[:.]?\s*/);
  let statement = body;
  let solution = '';
  if (solM) {
    statement = body.slice(0, solM.index).trim();
    solution = body.slice(solM.index + solM[0].length).trim();
  }
  return { url, competition, figures, statement: statement.trim(), solution: solution.trim() };
}

// Duyệt 1 category qua mọi page. requireFigure=true → chỉ giữ bài có ảnh hình.
async function crawlCategory(slug, { requireFigure = false } = {}) {
  const base = `https://julielltv.wordpress.com/category/${slug}/page/`;
  const out = [];
  for (let p = 1; p <= 30; p++) {
    const r = await get(base + p + '/');
    if (r.status !== 200) break;
    const blocks = r.body.split(/<article/).slice(1);
    if (!blocks.length) break;
    let kept = 0;
    let urlsThisPage = 0;
    for (const b of blocks) {
      const a = parseArticle('<article' + b);
      if (!a) continue;
      urlsThisPage++;
      if (a.statement.length <= 15) continue;
      if (requireFigure && a.figures.length === 0) continue;
      out.push(a);
      kept++;
    }
    console.error(`  ${slug} p${p}: giữ ${kept}/${urlsThisPage}`);
    if (urlsThisPage === 0) break;
  }
  return out;
}

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const REQUIRE_FIGURE = !args.includes('--no-figure'); // mặc định chỉ lấy bài CÓ hình
// các category hình học phẳng liên quan pipeline vẽ hình (ngoài hinh-hoc-phang đã thu)
const DEFAULT_CATS = [
  'cac-dinh-li-hinh-hoc',
  'su-thang-hang-cac-duong-dong-quy',
  'ti-so-kep-hang-diem-dieu-hoa',
  'he-thuc-luong-trong-tam-giac',
];
const CATS = (args.find((a) => a.startsWith('--cats='))?.split('=')[1]?.split(',') ?? DEFAULT_CATS);

const existing = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const seen = new Set(existing.problems.map((p) => p.url));

let crawled = [];
for (const c of CATS) crawled.push(...(await crawlCategory(c, { requireFigure: REQUIRE_FIGURE })));

const fresh = crawled.filter((c) => !seen.has(c.url));
// dedup nội bộ theo url
const dedup = [];
const localSeen = new Set();
for (const c of fresh) {
  if (localSeen.has(c.url)) continue;
  localSeen.add(c.url);
  dedup.push(c);
}

console.error(
  `\ncats=[${CATS.join(',')}] requireFigure=${REQUIRE_FIGURE} crawled=${crawled.length} fresh(new url)=${fresh.length} dedup=${dedup.length}`
);

let nextId = Math.max(...existing.problems.map((p) => p.id)) + 1;
const appended = dedup.map((c) => ({
  id: nextId++,
  url: c.url,
  competition: c.competition,
  figures: c.figures,
  statement: c.statement,
  solution: c.solution,
}));

if (!WRITE) {
  console.log('\n=== PREVIEW (3 bài mới đầu) ===');
  for (const p of appended.slice(0, 3)) {
    console.log(`\n[#${p.id}] ${p.url}`);
    console.log('  cuộc thi:', p.competition ?? '(không rõ)');
    console.log('  đề:', p.statement.slice(0, 300));
  }
  console.log(`\n→ ${appended.length} bài mới sẽ được append (id ${appended[0]?.id}–${appended.at(-1)?.id}).`);
  console.log('Chạy lại với --write để ghi.');
  process.exit(0);
}

const merged = {
  ...existing,
  note: existing.note + ` Bổ sung category [${CATS.join(', ')}] (chỉ bài có hình) 2026-06-20.`,
  count: existing.problems.length + appended.length,
  problems: [...existing.problems, ...appended],
};
fs.writeFileSync(JSON_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');

// regenerate md
const head = `# Hình học phẳng — Huy Cao's Blog (julielltv.wordpress.com)

> Nguồn: ${merged.source} · Chuyên mục: ${merged.category} · Thu thập: ${merged.collected} · ${merged.count} bài (đề Olympic/đội tuyển).
>
> LaTeX viết inline trong \`$...$\`. Dùng làm dữ liệu cho pipeline sinh hình (intent → DSL).
`;
const body = merged.problems
  .map((p) => {
    const title = p.competition ? `(${p.competition})` : '(không rõ nguồn thi)';
    const sol = p.solution
      ? `\n\n<details><summary>Lời giải</summary>\n\n${p.solution}\n\n</details>`
      : '';
    const fig = p.figures?.length ? `\n\nHình: ${p.figures.map((f) => `![](${f})`).join(' ')}` : '';
    return `## ${p.id}. ${title}\n\n**Đề:** ${p.statement}${fig}${sol}\n\nNguồn: ${p.url}`;
  })
  .join('\n\n---\n\n');
fs.writeFileSync(MD_PATH, head + '\n' + body + '\n', 'utf8');

console.log(`✅ Ghi ${merged.count} bài (append ${appended.length}). JSON + MD cập nhật.`);
