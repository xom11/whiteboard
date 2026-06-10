import { diameterEndpointRule } from '../diameterEndpoint';
import { segmentClauses } from '../../deterministic/coverage';

const run = (p: string) => diameterEndpointRule.match({ problem: p, clauses: segmentClauses(p) });

describe('diameterEndpointRule', () => {
  it('"Gọi AD là đường kính của (O)" → D = reflectPoint(A, O)', () => {
    const c = (run('Gọi AD là đường kính của (O)')[0].intents[0] as any);
    expect(c.name).toBe('D');
    expect(c.constraint).toEqual({ kind: 'reflectPoint', of: 'A', through: 'O' });
  });
  it('"BD là đường kính đường tròn tâm O"', () => {
    const c = (run('BD là đường kính đường tròn tâm O')[0].intents[0] as any);
    expect(c.constraint).toEqual({ kind: 'reflectPoint', of: 'B', through: 'O' });
  });
});
