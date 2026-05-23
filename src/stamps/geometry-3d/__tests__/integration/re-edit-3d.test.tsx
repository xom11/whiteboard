/**
 * Integration tests: geometry-3d re-edit roundtrip (G3 spec, post Tier D PR 3).
 *
 * Kiểm tra rằng:
 * 1. serializeBoard3D → deserializeBoard3D → createStore → ObjectListPanel
 *    hiển thị đúng các row từ state đã khôi phục.
 * 2. View info (azimuth/elevation/bbox3D) bake vào state.meta.view sau
 *    serialize/deserialize roundtrip.
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
import { serializeBoard3D, deserializeBoard3D } from '../../serialize';
import type { View3D } from '../../../../core/scene';

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

  it('serialize → deserialize roundtrip preserves order, attrs, meta + view giờ ở state.meta.view', () => {
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

    const view: View3D = {
      azimuth: 0.7,
      elevation: 0.4,
      bbox3D: [-3, 3, -3, 3, -3, 3],
    };
    const raw = serializeBoard3D(state, view);
    const restoredState = deserializeBoard3D(raw);

    expect(restoredState.order).toEqual(['A', 'B', 'C', 'P']);
    expect(restoredState.meta.domain).toBe('3d');
    if (restoredState.meta.domain === '3d') {
      expect(restoredState.meta.view.azimuth).toBe(0.7);
      expect(restoredState.meta.view.elevation).toBe(0.4);
    }
    expect(restoredState.objects['A'].attrs).toEqual({
      constraint: { kind: 'free', x: 1, y: 2, z: 0 },
    });
    expect(restoredState.objects['P'].attrs).toEqual({ p1: 'A', p2: 'B', p3: 'C' });
  });

  it('re-edit path: deserialize → createStore → object count đúng', () => {
    const A = makeObj('A', 'point3d', 'A', { constraint: { kind: 'free', x: 0, y: 0, z: 0 } });
    const B = makeObj('B', 'point3d', 'B', { constraint: { kind: 'free', x: 1, y: 0, z: 0 } });
    const seg = makeObj('s1', 'segment3d', 's1', { p1: 'A', p2: 'B' });
    const state = makeState3D([A, B, seg]);

    const view: View3D = { azimuth: 0, elevation: 0, bbox3D: [-5, 5, -5, 5, -5, 5] };
    const raw = serializeBoard3D(state, view);
    const restoredState = deserializeBoard3D(raw);

    const store = createStore(restoredState);
    expect(Object.keys(store.getState().objects)).toHaveLength(3);
    expect(store.getState().order).toEqual(['A', 'B', 's1']);
  });
});
