import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist';
const files = readdirSync(dir).filter(
  (f) => (f.endsWith('.js') || f.endsWith('.mjs')) && !f.startsWith('ai.'),
);
const directive = '"use client";\n';
const hasCss = existsSync(join(dir, 'index.css'));

for (const f of files) {
  const p = join(dir, f);
  let content = readFileSync(p, 'utf8');
  let changed = false;

  // 1) "use client" directive at line 1.
  if (!content.startsWith('"use client"') && !content.startsWith("'use client'")) {
    content = directive + content;
    changed = true;
    console.log(`[inject-use-client] prepended "use client" → ${p}`);
  }

  // 2) Auto-import bundled CSS — only for entry files (index.js / index.mjs).
  // Chunked files (e.g. ExcalidrawWithMenus-*.mjs) skip — they're imported from
  // the entry which already pulls CSS, and double-injecting from a chunk would
  // duplicate the side-effect import.
  if (hasCss && (f === 'index.js' || f === 'index.mjs')) {
    const cssRel = f.endsWith('.mjs') ? './index.css' : './index.css';
    const importStmt = f.endsWith('.mjs')
      ? `import '${cssRel}';\n`
      : `require('${cssRel}');\n`;
    if (!content.includes(cssRel)) {
      // Insert after "use client" directive (line 1).
      const firstNewline = content.indexOf('\n') + 1;
      content = content.slice(0, firstNewline) + importStmt + content.slice(firstNewline);
      changed = true;
      console.log(`[inject-use-client] auto-imported ${cssRel} → ${p}`);
    }
  }

  if (changed) writeFileSync(p, content);
}
