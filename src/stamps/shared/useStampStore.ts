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
// Roundtrip edit: khi double-click stamp existing element, `editingElement`
// được pass vào, hook gọi `parseInitial(customData)` để extract State trước
// khi createStore. Stamp tự define parseInitial vì format customData khác nhau.

import { useRef } from 'react';
import { createStore, createEmptyState, type Store } from '../../core/scene';
import type { State } from '../../core/scene/types';
import type { StampHostProps } from './types';

export type StampDomain = '2d' | '3d' | 'graph2d';

export type ParseInitialStateFn = (customData: unknown) => State | null;

export function useStampStore(
  domain: StampDomain,
  editingElement: StampHostProps['editingElement'],
  parseInitial: ParseInitialStateFn,
): Store {
  const ref = useRef<Store | null>(null);
  if (!ref.current) {
    const initial = editingElement?.customData
      ? parseInitial(editingElement.customData) ?? createEmptyState(domain)
      : createEmptyState(domain);
    ref.current = createStore(initial);
  }
  return ref.current;
}
