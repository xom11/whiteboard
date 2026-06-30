#!/usr/bin/env python
# compare.py — sinh trang HTML 3 cột: ẢNH đề (crop từ PDF) | TEXT OCR | HÌNH vẽ.
# Để KIỂM TRA performance pipeline: OCR đọc khớp ảnh? hình khớp text?
#
#   python scripts/pdf-dataset/compare.py <pagesDir> <figuresDir> <outHtml>
#
# - pagesDir   : thư mục PNG mỗi trang (rasterize @200dpi từ PDF — xem README b1).
# - figuresDir : output của render-figures.ts (cau-NNN.png + summary.json).
# - OCR        : đọc từ cache đã commit docs/datasets/sources/ocr/all.json.
# Cần `tesseract` CLI (vie+eng) cho bbox dòng + Pillow.
import json, re, subprocess, unicodedata, base64, sys, io, os
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PAGES, FIGS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
DATASET = f"{REPO}/docs/datasets/tong-hop-hinh-phang-vao10-2018-2019.txt"
OCR_CACHE = f"{REPO}/docs/datasets/sources/ocr/all.json"

STRONG = re.compile(r'Cho\s+(?:tam giác|tứ giác|đường tròn|nửa đường tròn|nửa|hình|hai|ba|bốn|góc|đoạn|điểm|\(|\d)|Từ\s+(?:điểm|một điểm)')
WEAK = re.compile(r'(Cho |Từ điểm |Từ một điểm |Gọi |Trên |Cho đường tròn|Cho tam giác|Cho hình|Cho nửa)')
LOIGIAI = re.compile(r'Lời giải|Loi giai|Lời gải')

def strip_headers(text):
    out = []
    for ln in text.split('\n'):
        s = ln.strip()
        if re.match(r'^Tạ Công Hoàng\s*-\s*Nguyễn Đăng Khoa', s): continue
        if re.match(r'^\d{1,3}$', s): continue
        out.append(ln)
    return '\n'.join(out)

def norm(s):
    s = unicodedata.normalize('NFD', s).lower()
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', s)

pages = {int(re.sub(r'\D', '', x['page'])): strip_headers(x['text']) for x in json.load(open(OCR_CACHE))}

def build_concat(lo, hi):
    parts, pmap, off = [], [], 0
    for n in range(lo, hi + 1):
        t = '\n' + pages.get(n, '')
        parts.append(t); pmap.append((off, n)); off += len(t)
    return ''.join(parts), pmap

def page_of(pmap, pos):
    pg = pmap[0][1]
    for o, n in pmap:
        if pos >= o: pg = n
        else: break
    return pg

problems = []  # (rawStmt, page)
ch2, pmap2 = build_concat(13, 114)
idx = 0
for seg in LOIGIAI.split(ch2)[:-1]:
    seg_start = ch2.find(seg, idx); idx = seg_start + len(seg)
    strongs = list(STRONG.finditer(seg))
    if strongs:
        st = strongs[-1].start()
    else:
        weaks = list(WEAK.finditer(seg))
        if not weaks: continue
        st = weaks[-1].start()
    raw = seg[st:]
    if len(re.sub(r'\s+', ' ', raw).strip()) < 25: continue
    problems.append((raw[:700], page_of(pmap2, seg_start + st)))

ch34, pmap34 = build_concat(115, 119)
for m in re.finditer(r'Bài\s*(\d+)\s*\.[\s\S]*?(?=Bài\s*\d+\s*\.|$)', ch34):
    raw = m.group(0)
    if len(re.sub(r'\s+', ' ', raw).strip()) < 25: continue
    problems.append((raw[:700], page_of(pmap34, m.start())))
print(f"segmented {len(problems)} problems", file=sys.stderr)

ds, cur = [], None
for line in open(DATASET, encoding='utf-8'):
    m = re.match(r'^Câu\s+(\d+):\s*(.*)$', line)
    if m:
        if cur is not None: ds.append(cur)
        cur = m.group(2)
    elif cur is not None and line.strip(): cur += ' ' + line.strip()
if cur is not None: ds.append(cur)

_tsv = {}
def page_lines(pg):
    if pg in _tsv: return _tsv[pg]
    out = subprocess.run(['tesseract', f"{PAGES}/p{pg:03d}.png", 'stdout', '-l', 'vie+eng', 'tsv'],
                         capture_output=True, text=True).stdout
    lines = {}
    for row in out.split('\n')[1:]:
        c = row.split('\t')
        if len(c) < 12 or c[0] != '5': continue
        key = tuple(c[1:5]); x, y, w, h = int(c[6]), int(c[7]), int(c[8]), int(c[9]); txt = c[11]
        L = lines.setdefault(key, {'t': '', 'x0': x, 'y0': y, 'x1': x + w, 'y1': y + h})
        L['t'] += txt; L['x0'] = min(L['x0'], x); L['y0'] = min(L['y0'], y)
        L['x1'] = max(L['x1'], x + w); L['y1'] = max(L['y1'], y + h)
    res = [{'n': norm(v['t']), **v} for v in lines.values() if norm(v['t'])]
    _tsv[pg] = res; return res

def crop_b64(raw, pg):
    pls = sorted(page_lines(pg), key=lambda l: (l['y0'], l['x0']))
    if not pls: return None
    stmt = norm(re.sub(r'\s+', ' ', raw)); head = stmt[:10]
    loi_y = next((pl['y0'] for pl in pls if 'loig' in pl['n'] and len(pl['n']) <= 9), None)
    above = [pl for pl in pls if loi_y is None or pl['y0'] < loi_y] or pls
    start_i = next((i for i, pl in enumerate(above)
                    if len(pl['n']) >= 5 and (head in pl['n'] or (len(pl['n']) >= 8 and pl['n'][:8] in stmt[:90]))), None)
    if start_i is None:
        best, bi = 0, None
        for i, pl in enumerate(above):
            ov = sum(1 for k in range(0, max(0, len(pl['n']) - 4)) if pl['n'][k:k + 5] in stmt[:90])
            if ov > best: best, bi = ov, i
        start_i = bi if bi is not None else 0
    cap_y = next((pl['y0'] for pl in above[start_i + 1:] if re.match(r'bai\d', pl['n'])), None)
    matched, acc = [], 0
    for pl in above[start_i:]:
        if cap_y is not None and pl['y0'] >= cap_y: break
        matched.append(pl); acc += len(pl['n'])
        if cap_y is None and loi_y is None and acc >= len(stmt) * 0.95: break
    if not matched: return None
    im = Image.open(f"{PAGES}/p{pg:03d}.png").convert('RGB')
    x0 = max(0, min(m['x0'] for m in matched) - 16); y0 = max(0, min(m['y0'] for m in matched) - 12)
    x1 = min(im.width, max(m['x1'] for m in matched) + 16); y1 = min(im.height, max(m['y1'] for m in matched) + 12)
    if y1 - y0 > 0.45 * im.height: y1 = int(y0 + 0.45 * im.height)
    if x1 - x0 < 20 or y1 - y0 < 12: return None
    crop = im.crop((x0, y0, x1, y1))
    if crop.width > 620: crop = crop.resize((620, int(crop.height * 620 / crop.width)))
    buf = io.BytesIO(); crop.save(buf, 'JPEG', quality=72)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

def fig_b64(i):
    p = f"{FIGS}/cau-{i:03d}.png"
    if not os.path.exists(p): return None
    im = Image.open(p).convert('RGB')
    if im.width > 360: im = im.resize((360, int(im.height * 360 / im.width)))
    buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

summ = {int(x['id']): x for x in json.load(open(f"{FIGS}/summary.json"))}
n = min(len(problems), len(ds)); ok_img = 0; rows = []
for i in range(n):
    cid = i + 1; raw, pg = problems[i]
    img = crop_b64(raw, pg); ok_img += 1 if img else 0
    fig = fig_b64(cid); s = summ.get(cid, {})
    mode = s.get('mode', 'none') if s.get('ok') else 'none'
    badge = {'full': '<span class="b bf">đầy đủ</span>', 'partial': '<span class="b bp">một phần</span>'}.get(mode, '<span class="b bn">chưa vẽ</span>')
    imgc = f'<img src="{img}">' if img else f'<div class="miss">(không cắt được — tr.{pg})</div>'
    figc = f'<img src="{fig}">' if fig else '<div class="miss">(chưa dựng được hình)</div>'
    rows.append(f'<tr><td class="idc">Câu {cid}<br><span class="pg">tr.{pg}</span><br>{badge}</td><td class="imgc">{imgc}</td><td class="txtc">{ds[i].replace("&","&amp;").replace("<","&lt;")}</td><td class="figc">{figc}</td></tr>')
print(f"crops ok {ok_img}/{n}", file=sys.stderr)

html = '''<style>
:root{--ink:#16203a;--mut:#5d6b86;--hair:#e4e8ef;--bg:#f6f7f9}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.wrap{max-width:1280px;margin:0 auto;padding:32px 20px 80px}
h1{font-size:26px;margin:0 0 4px;font-weight:700}.sub{color:var(--mut);margin:0 0 20px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--hair);border-radius:12px;overflow:hidden}
th{position:sticky;top:0;background:#eef1f6;color:#3b4760;font-size:12px;letter-spacing:.05em;text-transform:uppercase;padding:11px 12px;text-align:left;border-bottom:1px solid var(--hair)}
td{border-bottom:1px solid var(--hair);padding:12px;vertical-align:top}tr:last-child td{border-bottom:none}
.idc{width:78px;font-weight:650;font-size:13px}.pg{color:var(--mut);font-weight:400;font-size:12px}
.imgc{width:42%}.txtc{width:32%;font-size:13.5px;line-height:1.55;color:#2a3450}.figc{width:230px}
.imgc img,.figc img{max-width:100%;border:1px solid var(--hair);border-radius:6px;display:block}.figc img{background:#fcfcfd}
.miss{color:#b0392f;font-size:12px;font-style:italic;padding:8px 0}
.b{display:inline-block;margin-top:5px;font-size:11px;font-weight:650;padding:2px 8px;border-radius:999px}
.bf{background:#e8f3ec;color:#15803d}.bp{background:#fbf0e2;color:#b45309}.bn{background:#f1f1f4;color:#64748b}
</style>
<div class="wrap"><h1>Đối chiếu OCR → vẽ hình (vào 10 HHP 2018–2019)</h1>
<p class="sub">3 cột: <b>ẢNH đề gốc</b> (cắt từ PDF) · <b>TEXT OCR</b> · <b>HÌNH</b> tự dựng. ''' + f'{ok_img}/{n} cắt được ảnh.' + '''</p>
<table><thead><tr><th>#</th><th>Ảnh đề (PDF)</th><th>Text OCR</th><th>Hình vẽ</th></tr></thead><tbody>''' + '\n'.join(rows) + '''</tbody></table></div>'''
open(OUT, 'w', encoding='utf-8').write(html)
print(f"WROTE {OUT} ({len(html)//1024} KB)", file=sys.stderr)
