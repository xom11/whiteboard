// src/stamps/geometry-3d/editor/usePointDrag.ts
import * as React from 'react';
import { nextLabel, type State, type Store } from '../../../core/scene';
import type { Constraint3D } from '../../../core/scene/kinds/3d-constraint';
import type { Point3DAttrs } from '../../../core/scene/kinds/point3d';
import { hitTest } from './hitTest/hitTest';
import { rayPlane } from './hitTest/intersect';
import { screenToRay } from './hitTest/rayCast';
import { constraintToWorld, type Vec3 } from './scene/constraintMath';
import { hitToConstraint } from './tools/handlers/_ensurePoint';
import type { MiniBoard3DHandle } from './MiniBoard3D';
import type { ToolKey } from './tools/spec';

export interface UsePointDragOptions {
  store: Store;
  boardRef: React.RefObject<MiniBoard3DHandle | null>;
  /** Ref tới tool đang chọn — đọc tươi tránh stale closure trong drag. */
  selectedToolRef: React.RefObject<ToolKey>;
}

export interface UsePointDragHandlers {
  /**
   * Trả về true nếu gesture là drag/place point của ta. True cũng suppress
   * view rotation của MiniBoard3D suốt phần còn lại của gesture.
   */
  shouldStartPointDrag: (screen: { x: number; y: number }) => boolean;
  onPointerDrag: (screen: { x: number; y: number }) => void;
  onPointerDragEnd: () => void;
  /** True khi đang trong gesture drag — handleMove dùng để pause hover label. */
  isDragging: () => boolean;
}

// Point-drag handlers cho 3D editor: drag existing point (Z-only ở tool Point,
// XY raycast ở tool Move) + place-and-lift (tool Point trên ground/axis). Capture
// snapshot trước mọi mutation để onPointerDragEnd push một undo checkpoint duy
// nhất cho cả gesture.
export function usePointDrag(opts: UsePointDragOptions): UsePointDragHandlers {
  const { store, boardRef, selectedToolRef } = opts;

  const draggedPointRef = React.useRef<string | null>(null);
  const dragStartRef = React.useRef<{ screen: { x: number; y: number }; world: Vec3 } | null>(null);
  const dragSnapshotRef = React.useRef<State | null>(null);
  // Track liệu có mutation trong drag không — onPointerDragEnd dùng để quyết
  // định có cần push manual checkpoint qua LOAD-then-LOAD.
  const dragMutatedRef = React.useRef<boolean>(false);

  const shouldStartPointDrag = React.useCallback(
    (screen: { x: number; y: number }): boolean => {
      const view = boardRef.current?.getView3D();
      if (!view) return false;
      const tool = selectedToolRef.current;
      if (tool !== 'point' && tool !== 'move') return false;
      let hit;
      try {
        hit = hitTest(screen, view, store.getState());
      } catch {
        return false;
      }

      if (hit.kind === 'existingPoint') {
        const pt = store.getState().objects[hit.pointId];
        if (!pt || pt.kind !== 'point3d') return false;
        dragSnapshotRef.current = store.getState();
        dragMutatedRef.current = false;
        draggedPointRef.current = hit.pointId;
        dragStartRef.current = {
          screen,
          world: constraintToWorld((pt.attrs as Point3DAttrs).constraint, store.getState()),
        };
        return true;
      }

      // Point tool: place-and-lift. Capture snapshot trước, tạo point bên trong
      // withoutHistory để chỉ drag-end checkpoint nằm trên undo stack. Bypass
      // controller (Point tool repeatAfterBuild — không có collected để unwind);
      // path click→consumeHit→buildPoint bị short-circuit trong handlePointerUp
      // khi pointDragMode được set.
      if (tool === 'point' && (hit.kind === 'onGround' || hit.kind === 'onAxis')) {
        dragSnapshotRef.current = store.getState();
        dragMutatedRef.current = false;
        const constraint = hitToConstraint(hit);
        if (!constraint) {
          dragSnapshotRef.current = null;
          return false;
        }
        let id: string | null = null;
        store.withoutHistory(() => {
          const stateBefore = store.getState();
          const newId = `p${stateBefore.counter + 1}`;
          const label = nextLabel(stateBefore, 'point3d');
          store.dispatch({
            type: 'ADD',
            payload: {
              obj: {
                id: newId,
                kind: 'point3d',
                label,
                visible: true,
                locked: false,
                layer: 'default',
                schemaVersion: 1,
                attrs: { constraint },
              },
            },
          });
          id = newId;
        });
        if (!id) {
          dragSnapshotRef.current = null;
          return false;
        }
        draggedPointRef.current = id;
        dragStartRef.current = {
          screen,
          world: [hit.world[0], hit.world[1], hit.world[2]],
        };
        return true;
      }

      // Point tool nhưng non-placeable surface (sphere/plane/empty): suppress
      // view rotation để camera không xoay khi user đang place point, nhưng
      // không enter drag. Clear snapshot phòng hờ.
      if (tool === 'point') {
        dragSnapshotRef.current = null;
        draggedPointRef.current = null;
        dragStartRef.current = null;
        return true;
      }

      return false;
    },
    [store, boardRef, selectedToolRef],
  );

  const onPointerDrag = React.useCallback(
    (screen: { x: number; y: number }) => {
      const pointId = draggedPointRef.current;
      const start = dragStartRef.current;
      if (!pointId || !start) return;
      const view = boardRef.current?.getView3D();
      if (!view) return;
      const tool = selectedToolRef.current;
      let nextWorld: Vec3;
      if (tool === 'point') {
        // Vertical lift only — giữ X,Y; map screen-Y delta sang world Z (pixelToUser
        // đã invert Y rồi).
        const dz = screen.y - start.screen.y;
        nextWorld = [start.world[0], start.world[1], start.world[2] + dz];
      } else if (tool === 'move') {
        try {
          const ray = screenToRay(screen, view);
          const hit = rayPlane(ray, { point: [0, 0, start.world[2]], normal: [0, 0, 1] });
          if (!hit) return;
          nextWorld = [hit.point[0], hit.point[1], start.world[2]];
        } catch {
          return;
        }
      } else {
        return;
      }
      const obj = store.getState().objects[pointId];
      if (!obj || obj.kind !== 'point3d') return;
      const free: Constraint3D = { kind: 'free', x: nextWorld[0], y: nextWorld[1], z: nextWorld[2] };
      // UPDATE_ATTRS → fire subscribers, JxgRenderer3D diff + update JSXGraph.
      // Wrap withoutHistory: drag-end sẽ push 1 checkpoint duy nhất.
      store.withoutHistory(() => {
        store.dispatch({ type: 'UPDATE_ATTRS', payload: { id: pointId, patch: { constraint: free } } });
      });
      dragMutatedRef.current = true;
    },
    [store, boardRef, selectedToolRef],
  );

  const onPointerDragEnd = React.useCallback(() => {
    const snap = dragSnapshotRef.current;
    dragSnapshotRef.current = null;
    draggedPointRef.current = null;
    dragStartRef.current = null;
    dragMutatedRef.current = false;
    // Push undo checkpoint cho cả 2 flow: click-only (ADD point inside
    // withoutHistory → cần checkpoint manual) và drag-and-lift (ADD +
    // UPDATE_ATTRS đều bị withoutHistory wrap → cùng cần). Net: 1 entry duy
    // nhất trong past stack = snap → current. Nếu snap === current (degenerate),
    // 2 LOAD đều no-op, không push gì.
    if (snap) {
      const current = store.getState();
      store.withoutHistory(() => {
        store.dispatch({ type: 'LOAD', payload: { state: snap } });
      });
      store.dispatch({ type: 'LOAD', payload: { state: current } });
    }
  }, [store]);

  const isDragging = React.useCallback(() => draggedPointRef.current !== null, []);

  return { shouldStartPointDrag, onPointerDrag, onPointerDragEnd, isDragging };
}
