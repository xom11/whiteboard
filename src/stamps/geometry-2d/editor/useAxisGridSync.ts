import { useEffect } from 'react';
import { safeJsx } from '../../shared/safeJsx';
import { themeAxis, themeGrid } from './theme';

 
type JxgObj = any;

interface Params {
  boardRef: { readonly current: JxgObj };
  /** Refs giữ axis x/y JSXGraph objects để cleanup khi toggle off. */
  axisObjsRef: { current: { x?: JxgObj; y?: JxgObj } };
  isDarkRef: { readonly current: boolean };
  showAxis: boolean;
  showGrid: boolean;
}

/**
 * Sync hiển thị axis + grid khi user toggle qua LeftPanel.
 *
 * - Axis: tự tạo/xoá 2 axis object qua `boardRef.current.create('axis', ...)`.
 * - Grid: xoá grid cũ trong `board.objects` rồi tạo mới khi enable. Match
 *   theme color (axis/grid) theo `isDarkRef.current`.
 *
 * Mỗi effect chạy độc lập theo `showAxis` / `showGrid` để switch nhanh
 * không re-do cả 2 mỗi lần toggle 1.
 */
export function useAxisGridSync({
  boardRef,
  axisObjsRef,
  isDarkRef,
  showAxis,
  showGrid,
}: Params): void {
  useEffect(() => {
    const b = boardRef.current;
    if (!b) return;
    safeJsx('useAxisGridSync.toggleAxis', () => {
      if (axisObjsRef.current.x) {
        safeJsx('useAxisGridSync.removeAxisX', () => b.removeObject(axisObjsRef.current.x));
        axisObjsRef.current.x = undefined;
      }
      if (axisObjsRef.current.y) {
        safeJsx('useAxisGridSync.removeAxisY', () => b.removeObject(axisObjsRef.current.y));
        axisObjsRef.current.y = undefined;
      }
      if (showAxis) {
        axisObjsRef.current.x = b.create('axis', [[0, 0], [1, 0]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
        axisObjsRef.current.y = b.create('axis', [[0, 0], [0, 1]], { strokeColor: themeAxis(isDarkRef.current), name: '', withLabel: false });
      }
      b.update();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAxis]);

  useEffect(() => {
    const b = boardRef.current;
    if (!b) return;
    safeJsx('useAxisGridSync.toggleGrid', () => {
      for (const o of Object.values(b.objects || {}) as JxgObj[]) {
        if (o && (o.elType === 'grid' || o.type === 'grid' || (o.visProp && o.visProp.type === 'grid'))) {
          safeJsx('useAxisGridSync.removeGrid', () => b.removeObject(o));
        }
      }
      if (showGrid) b.create('grid', [], { strokeColor: themeGrid(isDarkRef.current), strokeOpacity: 1 });
      b.update();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrid]);
}
