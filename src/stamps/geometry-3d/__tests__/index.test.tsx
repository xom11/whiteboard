import { render } from '@testing-library/react';
import { createRef } from 'react';
import { geometry3dStamp, Geometry3DStampHost } from '../index';
import { isGeometry3DCustomData } from '../serialize';
import type { StampHostHandle } from '../../shared/types';

jest.mock('../editor/MiniBoard3D', () => ({
  MiniBoard3D: jest.fn(() => null),
}));

describe('geometry3dStamp', () => {
  it('có đủ trường StampType', () => {
    expect(geometry3dStamp.kind).toBe('geometry3d');
    expect(geometry3dStamp.shortcutKey).toBe('d');
    expect(geometry3dStamp.Host).toBeDefined();
    expect(typeof geometry3dStamp.matchesCustomData).toBe('function');
    expect(typeof geometry3dStamp.restoreFileFromCustomData).toBe('function');
  });

  it('matchesCustomData chỉ accept kind=geometry3d', () => {
    expect(
      geometry3dStamp.matchesCustomData({
        kind: 'geometry3d',
        version: 1,
        jsonState: '{}',
      }),
    ).toBe(true);
    expect(
      geometry3dStamp.matchesCustomData({ kind: 'geometry', version: 1, jsonState: '{}' }),
    ).toBe(false);
  });

  it('Host mount với editingElement=null', () => {
    const ref = createRef<StampHostHandle>();
    const Host = geometry3dStamp.Host;
    const minimalApi = {
      getSceneElements: () => [],
      addFiles: jest.fn(),
      getAppState: () => ({}),
      updateScene: jest.fn(),
      getFiles: () => ({}),
    };
    render(
      <Host
        ref={ref}
        api={minimalApi as never}
        editingElement={null}
        onClose={jest.fn()}
        isDark={false}
      />,
    );
    expect(ref.current).toBeTruthy();
    expect(typeof ref.current!.tryInsert).toBe('function');
    expect(typeof ref.current!.hasContent).toBe('function');
  });

  it('re-exports isGeometry3DCustomData', () => {
    expect(typeof isGeometry3DCustomData).toBe('function');
  });
});
