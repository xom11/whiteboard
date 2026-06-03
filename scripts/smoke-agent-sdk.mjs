// Smoke test: @anthropic-ai/claude-agent-sdk với OAuth subscription
// Measure latency cho simple JSON output.
// Usage: node scripts/smoke-agent-sdk.mjs

import { query } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync } from 'node:fs';

const creds = JSON.parse(
  readFileSync('/Users/lenamkhanh/.claude/.credentials.json', 'utf8'),
);
process.env.CLAUDE_CODE_OAUTH_TOKEN = creds.claudeAiOauth.accessToken;
delete process.env.ANTHROPIC_API_KEY;

const start = Date.now();
const SYS = 'You are a JSON emitter. Reply with VALID JSON only.';
const USR = 'Emit {"hello": "world"} verbatim.';

console.log('Starting query...');
try {
  for await (const msg of query({
    prompt: USR,
    options: {
      systemPrompt: SYS,
      allowedTools: [],
      model: 'claude-sonnet-4-6',
    },
  })) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (msg.type === 'assistant') {
      const text = msg.message.content
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('');
      console.log(`[${elapsed}s] assistant: ${text.slice(0, 200)}`);
    } else if (msg.type === 'result') {
      console.log(
        `[${elapsed}s] result subtype=${msg.subtype} duration=${msg.duration_ms}ms`,
      );
    } else {
      console.log(`[${elapsed}s] type=${msg.type}`);
    }
  }
  console.log(`✅ Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
} catch (e) {
  console.error(`❌ FAIL: ${e.message}`);
  process.exit(1);
}
