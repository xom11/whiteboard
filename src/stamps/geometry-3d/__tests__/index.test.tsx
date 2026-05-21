import * as React from 'react';
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { geometry3dStamp } from '../index';
import { isGeometry3DCustomData } from '../serialize';
import { Geometry3DStampHost } from '../host';
import type { StampHostHandle } from '../../shared/types';

// New MiniBoard3D is a forwardRef. Mock it as a render-null component that
// still exposes the new handle shape so the EditorPanel renderer setup
// doesn't crash during the host mount smoke test.
jest.mock('../editor/MiniBoard3D', () => ({
  MiniBoard3D: React.forwardRef<unknown, { isDark: boolean }>(function MockBoard(_, ref) {
    React.useImperativeHandle(ref, () => ({
      getBoard: () => null,
      getView3D: () => null,
      getSvgElement: () => null,
    }));
    return null;
  }),
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
    const Host = Geometry3DStampHost;
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

  it('isGeometry3DCustomData type guard importable from serialize', () => {
    expect(typeof isGeometry3DCustomData).toBe('function');
  });
});
