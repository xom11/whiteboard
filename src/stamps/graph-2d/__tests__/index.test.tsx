import { graph2dStamp, isGraph2DCustomData } from '../index';

describe('graph2dStamp', () => {
  it('kind = "graph2d"', () => {
    expect(graph2dStamp.kind).toBe('graph2d');
  });
  it('shortcutKey = "h"', () => {
    expect(graph2dStamp.shortcutKey).toBe('h');
  });
  it('matchesCustomData true cho data hợp lệ', () => {
    expect(graph2dStamp.matchesCustomData({ kind: 'graph2d', version: 1, jsonState: '{}' })).toBe(true);
  });
  it('matchesCustomData false cho data sai kind', () => {
    expect(graph2dStamp.matchesCustomData({ kind: 'geometry', version: 1 })).toBe(false);
  });
  it('isGraph2DCustomData guard', () => {
    expect(isGraph2DCustomData({ kind: 'graph2d', version: 1, jsonState: '{}' })).toBe(true);
    expect(isGraph2DCustomData({ kind: 'graph2d', version: 2, jsonState: '{}' })).toBe(false);
    expect(isGraph2DCustomData(null)).toBe(false);
    expect(isGraph2DCustomData(undefined)).toBe(false);
  });
});
