// intentToDsl.golden.test.ts
//
// Lưới an toàn Mức 3 (issue #45): đóng băng output intentsToDsl trên corpus
// curated (phủ mọi builder branch) + corpus generated từ probes. Mọi refactor
// builder PHẢI giữ snapshot byte-identical.
import { intentsToDsl } from '../intentToDsl';
import type { IntentT } from '../intent';
import { CURATED_CORPUS } from './__fixtures__/intent-corpus.curated';
import generated from './__fixtures__/intent-corpus.generated.json';

describe('intentsToDsl — golden (behavior-preserving Mức 3)', () => {
  for (const c of CURATED_CORPUS) {
    test(`curated: ${c.name}`, () => {
      expect(intentsToDsl(c.intents)).toMatchSnapshot();
    });
  }
  (generated as { problem: string; intents: IntentT[] }[]).forEach((c, i) => {
    test(`generated[${i}]: ${c.problem.slice(0, 50)}`, () => {
      expect(intentsToDsl(c.intents)).toMatchSnapshot();
    });
  });
});
