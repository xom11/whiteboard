import { renderHook } from '@testing-library/react';
import { useStampDoubleClick } from '../useStampDoubleClick';
import { STABLE_STAMPS, geometryStamp } from '../registry';

describe('useStampDoubleClick', () => {
  it('không fire khi click 1 lần', () => {
    const onOpen = jest.fn();
    const { result } = renderHook(() =>
      useStampDoubleClick({ enabled: true, stamps: STABLE_STAMPS, onOpen }),
    );
    const customData = { kind: 'geometry', version: 1, jsonState: '{}' };
    const pds = { hit: { element: { id: 'a', type: 'image', customData } } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(null as any, pds as any);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('fire openStamp khi double-click cùng image element trong 400ms', () => {
    const onOpen = jest.fn();
    const { result } = renderHook(() =>
      useStampDoubleClick({ enabled: true, stamps: STABLE_STAMPS, onOpen }),
    );
    const customData = { kind: 'geometry', version: 1, jsonState: '{}' };
    const pds = { hit: { element: { id: 'a', type: 'image', customData } } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(null as any, pds as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(null as any, pds as any);
    expect(onOpen).toHaveBeenCalledWith(geometryStamp.kind, {
      id: 'a',
      customData,
    });
  });

  it('không fire khi disabled', () => {
    const onOpen = jest.fn();
    const { result } = renderHook(() =>
      useStampDoubleClick({ enabled: false, stamps: STABLE_STAMPS, onOpen }),
    );
    const customData = { kind: 'geometry', version: 1, jsonState: '{}' };
    const pds = { hit: { element: { id: 'a', type: 'image', customData } } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(null as any, pds as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current(null as any, pds as any);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
