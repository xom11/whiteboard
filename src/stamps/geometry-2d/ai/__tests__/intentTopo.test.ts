import { orderIntentsByDependency } from '../intentTopo';
import type { IntentT } from '../intent';

const tri = (labels = ['A', 'B', 'C']): IntentT =>
  ({ op: 'draw-shape', shape: 'triangle', labels, variant: 'any' }) as IntentT;
const mid = (name: string, of: string): IntentT =>
  ({ op: 'add-point', name, constraint: { kind: 'midpoint', of } }) as IntentT;
const conn = (from: string, to: string): IntentT =>
  ({ op: 'connect', from, to, style: 'segment' }) as IntentT;
const mark = (labels: string[]): IntentT =>
  ({ op: 'mark-shape', shape: 'triangle', labels }) as IntentT;

describe('orderIntentsByDependency', () => {
  it('thứ tự ĐÃ hợp lệ giữ NGUYÊN từng phần tử (stable)', () => {
    const intents = [tri(), mid('M', 'BC'), conn('A', 'M')];
    expect(orderIntentsByDependency(intents)).toEqual(intents);
  });

  it('consumer đứng trước producer → hoist producer lên trước', () => {
    const m = mid('M', 'BC');
    const t = tri();
    expect(orderIntentsByDependency([m, t])).toEqual([t, m]);
  });

  it('mark-shape đứng trước draw-shape sinh đỉnh → xếp sau', () => {
    const mk = mark(['A', 'B', 'C']);
    const t = tri();
    expect(orderIntentsByDependency([mk, t])).toEqual([t, mk]);
  });

  it('ref cặp đỉnh "BC" trong constraint được tách để nhận dependency', () => {
    const k: IntentT = {
      op: 'add-point',
      name: 'K',
      constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' },
    } as IntentT;
    const t = tri();
    expect(orderIntentsByDependency([k, t])).toEqual([t, k]);
  });

  it('ref cặp CÓ CHỈ SỐ "B1C1" tách theo longest-prefix tên đã produce', () => {
    const b1: IntentT = { op: 'add-point', name: 'B1', constraint: { kind: 'free' } } as IntentT;
    const c1: IntentT = { op: 'add-point', name: 'C1', constraint: { kind: 'free' } } as IntentT;
    const x: IntentT = {
      op: 'add-point',
      name: 'X',
      constraint: { kind: 'perpFoot', from: 'B1', onLine: 'B1C1' },
    } as IntentT;
    expect(orderIntentsByDependency([x, b1, c1])).toEqual([b1, c1, x]);
  });

  it('tên không ai produce → không chặn (transpile sẽ fail-safe)', () => {
    const k: IntentT = {
      op: 'add-point',
      name: 'K',
      constraint: { kind: 'perpFoot', from: 'Z', onLine: 'ZW' },
    } as IntentT;
    const t = tri();
    const out = orderIntentsByDependency([k, t]);
    expect(out).toHaveLength(2);
    expect(out).toEqual(expect.arrayContaining([k, t]));
  });

  it('cycle (A cần B, B cần A) → giữ nguyên thứ tự gốc, đủ phần tử', () => {
    const a: IntentT = {
      op: 'add-point',
      name: 'A',
      constraint: { kind: 'reflectPoint', of: 'B', through: 'B' },
    } as IntentT;
    const b: IntentT = {
      op: 'add-point',
      name: 'B',
      constraint: { kind: 'reflectPoint', of: 'A', through: 'A' },
    } as IntentT;
    expect(orderIntentsByDependency([a, b])).toEqual([a, b]);
  });
});
