import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist';
const files = readdirSync(dir).filter((f) => f.endsWith('.js') || f.endsWith('.mjs'));
const directive = '"use client";\n';

for (const f of files) {
  const p = join(dir, f);
  const content = readFileSync(p, 'utf8');
  if (content.startsWith('"use client"') || content.startsWith("'use client'")) continue;
  writeFileSync(p, directive + content);
  console.log(`[inject-use-client] prepended → ${p}`);
}
