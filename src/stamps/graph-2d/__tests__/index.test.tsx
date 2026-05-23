// src/stamps/graph-2d/__tests__/index.test.tsx
import { graph2dStamp } from '../index';
import { isGraph2DCustomData } from '../types';

describe('graph2dStamp', () => {
  it('kind = "graph2d"', () => {
    expect(graph2dStamp.kind).toBe('graph2d');
  });

  it('matchesCustomData accepts v2', () => {
    expect(graph2dStamp.matchesCustomData({ kind: 'graph2d', version: 2, jsonState: '{}' })).toBe(true);
  });

  it('matchesCustomData rejects v1', () => {
    expect(graph2dStamp.matchesCustomData({ kind: 'graph2d', version: 1, jsonState: '{}' })).toBe(false);
  });

  it('matchesCustomData rejects other kinds', () => {
    expect(graph2dStamp.matchesCustomData({ kind: 'geometry', version: 2, jsonState: '{}' })).toBe(false);
  });

  it('matchesCustomData rejects null/undefined', () => {
    expect(graph2dStamp.matchesCustomData(null)).toBe(false);
    expect(graph2dStamp.matchesCustomData(undefined)).toBe(false);
  });

  it('shortcutKey = "h"', () => {
    expect(graph2dStamp.shortcutKey).toBe('h');
  });

  it('experimental = true (EXPERIMENTAL_STAMPS)', () => {
    expect(graph2dStamp.experimental).toBe(true);
  });
});

describe('isGraph2DCustomData', () => {
  it('trả về true cho v2 hợp lệ', () => {
    expect(isGraph2DCustomData({ kind: 'graph2d', version: 2, jsonState: '{}' })).toBe(true);
  });

  it('trả về false cho v1', () => {
    expect(isGraph2DCustomData({ kind: 'graph2d', version: 1 })).toBe(false);
  });

  it('trả về false nếu thiếu jsonState', () => {
    expect(isGraph2DCustomData({ kind: 'graph2d', version: 2 })).toBe(false);
  });

  it('trả về false cho null', () => {
    expect(isGraph2DCustomData(null)).toBe(false);
  });
});
