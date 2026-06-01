// Inspect single prompt output từ Ollama (debug failure modes).
import { generateFigure, OllamaProvider } from '../src/stamps/geometry-2d/ai';

async function main() {
  const model = process.argv[2] || 'gemma3:4b';
  const prompt = process.argv[3] || 'Tam giác ABC, AD là phân giác góc A (D thuộc BC).';
  const provider = new OllamaProvider();

  console.log(`Model: ${model}\nPrompt: ${prompt}\n`);
  const r = await generateFigure(prompt, { provider, model, maxTokens: 4096 });
  if (r.ok) {
    console.log('OK:', JSON.stringify(r.dsl, null, 2));
  } else {
    console.log(`Failed [${r.reason}]: ${r.message}`);
    if ('dsl' in r) console.log('DSL emitted:', JSON.stringify(r.dsl, null, 2));
    if ('errors' in r) console.log('Errors:', r.errors);
    if ('raw' in r) console.log('Raw:', r.raw);
  }
}
main().catch(console.error);
