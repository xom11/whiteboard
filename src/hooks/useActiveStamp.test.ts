import { act, renderHook } from '@testing-library/react';
import { useActiveStamp } from './useActiveStamp';
import type { StampType } from '../stamps/shared/registry';

const fakeStamp = (kind: string): StampType =>
  ({ kind, Host: () => null }) as unknown as StampType;

describe('useActiveStamp', () => {
  it('default state activeStamp=null, editingElement=null', () => {
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: false, stamps: [fakeStamp('geom2d')] }),
    );
    expect(result.current.activeStamp).toBeNull();
    expect(result.current.editingElement).toBeNull();
  });

  it('openStamp(kind) set activeStamp + editingElement', () => {
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: false, stamps: [fakeStamp('geom2d')] }),
    );
    act(() => result.current.openStamp('geom2d', { id: 'e1', customData: { x: 1 } }));
    expect(result.current.activeStamp).toBe('geom2d');
    expect(result.current.editingElement).toEqual({ id: 'e1', customData: { x: 1 } });
  });

  it('openStamp respect readOnly = no-op', () => {
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: true, stamps: [fakeStamp('geom2d')] }),
    );
    act(() => result.current.openStamp('geom2d'));
    expect(result.current.activeStamp).toBeNull();
  });

  it('openStamp bỏ qua kind không có trong stamps', () => {
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: false, stamps: [fakeStamp('geom2d')] }),
    );
    act(() => result.current.openStamp('unknown'));
    expect(result.current.activeStamp).toBeNull();
  });

  it('closeStamp reset cả 2 field', () => {
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: false, stamps: [fakeStamp('geom2d')] }),
    );
    act(() => result.current.openStamp('geom2d', { id: 'e1', customData: {} }));
    act(() => result.current.closeStamp());
    expect(result.current.activeStamp).toBeNull();
    expect(result.current.editingElement).toBeNull();
  });

  it('toggleStampByKind: same kind = close; other kind = open', () => {
    const { result } = renderHook(() =>
      useActiveStamp({
        readOnly: false,
        stamps: [fakeStamp('a'), fakeStamp('b')],
      }),
    );
    act(() => result.current.toggleStampByKind('a'));
    expect(result.current.activeStamp).toBe('a');
    act(() => result.current.toggleStampByKind('a'));
    expect(result.current.activeStamp).toBeNull();
    act(() => result.current.toggleStampByKind('b'));
    expect(result.current.activeStamp).toBe('b');
  });

  it('exposes stampByKind map + activeStampDef + HostComponent', () => {
    const sA = fakeStamp('a');
    const { result } = renderHook(() =>
      useActiveStamp({ readOnly: false, stamps: [sA] }),
    );
    expect(result.current.stampByKind.get('a')).toBe(sA);
    expect(result.current.activeStampDef).toBeNull();
    expect(result.current.HostComponent).toBeNull();
    act(() => result.current.openStamp('a'));
    expect(result.current.activeStampDef).toBe(sA);
    expect(result.current.HostComponent).toBe(sA.Host);
  });
});
