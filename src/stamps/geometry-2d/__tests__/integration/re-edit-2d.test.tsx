/**
 * Integration tests: geometry-2d re-edit roundtrip (G3 spec).
 *
 * Kiểm tra rằng:
 * 1. serializeBoard → deserializeBoard → createStore → ObjectListPanel
 *    hiển thị đúng các row từ state đã khôi phục.
 * 2. serializeBoard → JSON.stringify → JSON.parse → deserializeBoard
 *    roundtrip giữ nguyên state.objects / order / meta.
 *
 * Test mid-level: mount ObjectListPanel + store (không mount toàn bộ Host vì
 * Host phụ thuộc ExcalidrawAPI không chạy được trong jsdom).
 */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  makeObj,
  makeState2D,
} from '../../../__tests__/helpers/integrationFixtures';
import { createStore } from '../../../../core/scene/store';
import { ObjectListPanel } from '../../../../core/scene/ui/ObjectListPanel';
import {
  serializeBoard,
  deserializeBoard,
} from '../../serialize';

// Import side-effects: register all 2D/3D kinds
import '../../../../core/scene/kinds';

describe('geometry-2d integration: re-edit roundtrip', () => {
  it('restores 3 objects (2 points + 1 segment) and renders panel rows', async () => {
    const A = makeObj('A', 'point', 'A', {
      constraint: { kind: 'free', x: 1, y: 2 },
    });
    const B = makeObj('B', 'point', 'B', {
      constraint: { kind: 'free', x: 3, y: 4 },
    });
    const AB = makeObj('AB', 'segment', 'AB', { p1: 'A', p2: 'B' });
    const state = makeState2D([A, B, AB]);
    const store = createStore(state);

    render(<ObjectListPanel store={store} />);

    await waitFor(() => {
      expect(screen.getByTestId('object-row-A')).toBeInTheDocument();
      expect(screen.getByTestId('object-row-B')).toBeInTheDocument();
      expect(screen.getByTestId('object-row-AB')).toBeInTheDocument();
    });

    expect(store.getState().order).toEqual(['A', 'B', 'AB']);
    expect(store.getState().meta.domain).toBe('2d');
  });

  it('serialize → deserialize roundtrip preserves order, attrs, meta (view giờ ở state.meta.view)', () => {
    const A = makeObj('A', 'point', 'A', {
      constraint: { kind: 'free', x: 1, y: 2 },
    });
    const B = makeObj('B', 'point', 'B', {
      constraint: { kind: 'free', x: 3, y: 4 },
    });
    const AB = makeObj('AB', 'segment', 'AB', { p1: 'A', p2: 'B' });
    const state = makeState2D([A, B, AB]);
    const view = { bbox: [-5, 5, 5, -5] as const, showAxis: true, showGrid: false };

    const raw = serializeBoard(state, view);
    const restored = deserializeBoard(raw);

    expect(restored.meta.domain).toBe('2d');
    if (restored.meta.domain === '2d') {
      expect(restored.meta.view.bbox).toEqual([-5, 5, 5, -5]);
      expect(restored.meta.view.showAxis).toBe(true);
      expect(restored.meta.view.showGrid).toBe(false);
    }
    expect(restored.order).toEqual(['A', 'B', 'AB']);
    expect(restored.objects['A'].attrs).toEqual({
      constraint: { kind: 'free', x: 1, y: 2 },
    });
    expect(restored.objects['AB'].attrs).toEqual({ p1: 'A', p2: 'B' });
  });

  it('re-edit path: deserialize → createStore → object count đúng', () => {
    const A = makeObj('A', 'point', 'A', { constraint: { kind: 'free', x: 0, y: 0 } });
    const B = makeObj('B', 'point', 'B', { constraint: { kind: 'free', x: 1, y: 1 } });
    const C = makeObj('C', 'point', 'C', { constraint: { kind: 'free', x: 2, y: 0 } });
    const seg = makeObj('s1', 'segment', 's1', { p1: 'A', p2: 'B' });
    const state = makeState2D([A, B, C, seg]);
    const view = { bbox: [-5, 5, 5, -5] as const, showAxis: false, showGrid: false };

    const raw = serializeBoard(state, view);
    const restored = deserializeBoard(raw);

    const store = createStore(restored);
    expect(Object.keys(store.getState().objects)).toHaveLength(4);
    expect(store.getState().order).toEqual(['A', 'B', 'C', 's1']);
  });
});
