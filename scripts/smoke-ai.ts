import { generateFigure } from '../src/stamps/geometry-2d/ai';

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Thiếu ANTHROPIC_API_KEY. Thiết lập biến môi trường trước khi chạy smoke test.');
    process.exitCode = 1;
    return;
  }

  const problem = process.argv.slice(2).join(' ').trim()
    || 'Cho tam giác ABC. Gọi M là trung điểm BC và vẽ trung tuyến AM.';
  const result = await generateFigure(problem, { apiKey });
  if (!result.ok) {
    console.error(`AI smoke thất bại (${result.reason}): ${result.message}`);
    process.exitCode = 1;
    return;
  }

  const objects = Object.values(result.state.objects);
  console.log('AI smoke thành công.');
  console.log(`Đề: ${problem}`);
  console.log(`Đối tượng: ${objects.length} (${objects.map((obj) => `${obj.kind}:${obj.label}`).join(', ')})`);
  console.log(`Tokens: input=${result.usage.inputTokens}, output=${result.usage.outputTokens}, cacheRead=${result.usage.cacheReadTokens}, cacheCreate=${result.usage.cacheCreationTokens}`);
}

void main();
