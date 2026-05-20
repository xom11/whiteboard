/**
 * Integration tests: geometry-3d re-edit roundtrip (G3 spec).
 *
 * Kiểm tra rằng:
 * 1. serializeBoard3D → deserializeBoard3D → createStore → ObjectListPanel
 *    hiển thị đúng các row từ state đã khôi phục.
 * 2. serializeBoard3D → JSON.stringify → JSON.parse → parseSerializedBoard3D
 *    roundtrip giữ nguyên state + view.
 *
 * Test mid-level: mount ObjectListPanel + store (không mount toàn bộ Host vì
 * Host phụ thuộc ExcalidrawAPI không chạy được trong jsdom).
 */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  makeObj,
  makeState3D,
} from '../../../__tests__/helpers/integrationFixtures';
import { createStore } from '../../../../core/scene/store';
import { ObjectListPanel } from '../../../../core/scene/ui/ObjectListPanel';
import {
  serializeBoard3D,
  deserializeBoard3D,
  parseSerializedBoard3D,
  type SerializedView3D,
} from '../../serialize';

// Import side-effects: register all 2D/3D kinds
import '../../../../core/scene/kinds';

describe('geometry-3d integration: re-edit roundtrip', () => {
  it('restores 4 objects (3 points + 1 plane) and renders panel rows', async () => {
    const A = makeObj('A', 'point3d', 'A', {
      constraint: { kind: 'free', x: 1, y: 2, z: 0 },
    });
    const B = makeObj('B', 'point3d', 'B', {
      constraint: { kind: 'free', x: 0, y: 1, z: 1 },
    });
    const C = makeObj('C', 'point3d', 'C', {
      constraint: { kind: 'free', x: 1, y: 0, z: 1 },
    });
    const plane = makeObj('P', 'plane3d', 'P', { p1: 'A', p2: 'B', p3: 'C' });
    const state = makeState3D([A, B, C, plane]);
    const store = createStore(state);

    render(<ObjectListPanel store={store} />);

    await waitFor(() => {
      expect(screen.getByTestId('object-row-A')).toBeInTheDocument();
      expect(screen.getByTestId('object-row-B')).toBeInTheDocument();
      expect(screen.getByTestId('object-row-C')).toBeInTheDocument();
      expect(screen.getByTestId('object-row-P')).toBeInTheDocument();
    });

    expect(store.getState().order).toEqual(['A', 'B', 'C', 'P']);
    expect(store.getState().meta.domain).toBe('3d');
  });

  it('serialize → deserialize roundtrip preserves order, attrs, meta', () => {
    const A = makeObj('A', 'point3d', 'A', {
      constraint: { kind: 'free', x: 1, y: 2, z: 0 },
    });
    const B = makeObj('B', 'point3d', 'B', {
      constraint: { kind: 'free', x: 0, y: 1, z: 1 },
    });
    const C = makeObj('C', 'point3d', 'C', {
      constraint: { kind: 'free', x: 1, y: 0, z: 1 },
    });
    const plane = makeObj('P', 'plane3d', 'P', { p1: 'A', p2: 'B', p3: 'C' });
    const state = makeState3D([A, B, C, plane]);

    const view: SerializedView3D = {
      azimuth: 0.7,
      elevation: 0.4,
      bbox3D: [-3, -3, -3, 3, 3, 3],
    };
    const serialized = serializeBoard3D(state, view);

    // Simulate JSON roundtrip (as stored in Excalidraw customData.jsonState)
    const raw = JSON.parse(JSON.stringify(serialized));
    const restoredState = deserializeBoard3D(raw);

    expect(restoredState.order).toEqual(['A', 'B', 'C', 'P']);
    expect(restoredState.meta.domain).toBe('3d');
    expect(restoredState.objects['A'].attrs).toEqual({
      constraint: { kind: 'free', x: 1, y: 2, z: 0 },
    });
    expect(restoredState.objects['P'].attrs).toEqual({ p1: 'A', p2: 'B', p3: 'C' });

    // parseSerializedBoard3D also restores view
    const parsed = parseSerializedBoard3D(raw);
    expect(parsed.view).toEqual(view);
    expect(parsed.state.order).toEqual(['A', 'B', 'C', 'P']);
  });

  it('re-edit path: deserialize → createStore → panel reflects correct object count', () => {
    const A = makeObj('A', 'point3d', 'A', { constraint: { kind: 'free', x: 0, y: 0, z: 0 } });
    const B = makeObj('B', 'point3d', 'B', { constraint: { kind: 'free', x: 1, y: 0, z: 0 } });
    const seg = makeObj('s1', 'segment3d', 's1', { p1: 'A', p2: 'B' });
    const state = makeState3D([A, B, seg]);

    const serialized = serializeBoard3D(state);
    const raw = JSON.parse(JSON.stringify(serialized));
    const restoredState = deserializeBoard3D(raw);

    const store = createStore(restoredState);
    expect(Object.keys(store.getState().objects)).toHaveLength(3);
    expect(store.getState().order).toEqual(['A', 'B', 's1']);
  });
});
