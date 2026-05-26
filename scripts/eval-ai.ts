import { generateFigure } from '../src/stamps/geometry-2d/ai';
import { EVAL_CASES, evaluateResult, sumUsage } from './ai-eval-lib';

function readFlag(name: string): string | undefined {
  const explicit = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (explicit) return explicit.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Thiếu ANTHROPIC_API_KEY. Thiết lập biến môi trường trước khi chạy eval.');
    process.exitCode = 1;
    return;
  }

  const limitRaw = readFlag('--limit');
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : EVAL_CASES.length;
  if (!Number.isInteger(limit) || limit < 1) {
    console.error('--limit phải là số nguyên dương.');
    process.exitCode = 1;
    return;
  }
  const model = readFlag('--model');
  const selected = EVAL_CASES.slice(0, Math.min(limit, EVAL_CASES.length));
  const outcomes = [];

  for (const [index, evalCase] of selected.entries()) {
    const result = await generateFigure(evalCase.problem, {
      apiKey,
      ...(model ? { model } : {}),
    });
    const outcome = evaluateResult(evalCase, result);
    outcomes.push(outcome);
    const status = outcome.passed ? 'PASS' : 'FAIL';
    const details = outcome.error
      ?? [
        outcome.missingLabels.length ? `labels=${outcome.missingLabels.join(',')}` : '',
        outcome.missingKinds.length ? `kinds=${outcome.missingKinds.join(',')}` : '',
      ].filter(Boolean).join(' ');
    console.log(`[${index + 1}/${selected.length}] ${status} ${evalCase.id}${details ? ` - ${details}` : ''}`);
  }

  const passed = outcomes.filter((outcome) => outcome.passed).length;
  const usage = sumUsage(outcomes);
  console.log(`\nKết quả: ${passed}/${outcomes.length} đạt.`);
  console.log(`Tokens: input=${usage.inputTokens}, output=${usage.outputTokens}, cacheRead=${usage.cacheReadTokens}, cacheCreate=${usage.cacheCreationTokens}`);

  if (passed !== outcomes.length) process.exitCode = 1;
}

void main();
