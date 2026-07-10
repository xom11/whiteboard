// Hook tạo + giữ scene store tại Host level cho mọi stamp interactive
// (geometry-2d, geometry-3d, graph-2d).
//
// Trước đây mỗi stamp dùng pattern riêng:
//   - 3D: useRef + createStore(createEmptyState('3d')) inline tại host.
//   - 2D + graph-2d: useState<Store|null> + callback `onStoreReady` từ editor.
//
// Hook này hợp nhất về 1 mental model: store sống ở host, identity stable,
// pre-load từ customData ngay frame đầu → bỏ ternary `store ? ... : undefined`
// + bỏ flash 1 frame trên 2D + graph-2d.
//
// Roundtrip edit: caller tự chịu trách nhiệm đọc `editingElement.customData`
// và trả về State (hoặc null) qua thunk `makeInitialState`.

import { useRef } from 'react';
import { createStore, createEmptyState, type Store } from '../../core/scene';
import type { State } from '../../core/scene/types';

export type StampDomain = '2d' | '3d' | 'graph2d';

/**
 * Tạo + giữ scene store tại Host level. `makeInitialState` là THUNK LƯỜI:
 * chỉ gọi đúng một lần ở render đầu, nên caller thoải mái đặt
 * `deserializeBoard(...)` bên trong mà không sợ parse lại mỗi render.
 */
export function useStampStore(
  domain: StampDomain,
  makeInitialState?: () => State | null,
): Store {
  const ref = useRef<Store | null>(null);
  if (!ref.current) {
    ref.current = createStore(makeInitialState?.() ?? createEmptyState(domain));
  }
  return ref.current;
}
