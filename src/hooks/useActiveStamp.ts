import { useCallback, useMemo, useRef, useState } from 'react';
import type { StampType } from '../stamps/shared/registry';

export interface EditingElement {
  id: string;
  customData: unknown;
}

export interface UseActiveStampOptions {
  readOnly: boolean;
  stamps: ReadonlyArray<StampType>;
}

export interface UseActiveStampResult {
  activeStamp: string | null;
  editingElement: EditingElement | null;
  /** Dữ liệu gieo cho stamp MỚI (xem StampHostProps.initialCustomData). */
  seedCustomData: unknown;
  /**
   * Tăng mỗi lần MỞ một stamp. Whiteboard gắn `onClose` của host với phiên:
   * lời gọi đóng MUỘN từ phiên cũ (vd tryInsert chèn bất đồng bộ xong mới
   * onClose) không được đóng stamp của phiên mới.
   */
  session: number;
  /**
   * Đóng stamp NẾU phiên `s` vẫn là phiên mới nhất. So với ref tăng ĐỒNG BỘ
   * lúc mở, không so với giá trị đã render: onClose muộn có thể chạy TRƯỚC khi
   * React render lại (microtask), lúc đó giá trị render vẫn là phiên cũ.
   */
  closeStampIfSession: (s: number) => void;
  stampByKind: Map<string, StampType>;
  activeStampDef: StampType | null;
  HostComponent: StampType['Host'] | null;
  openStamp: (kind: string, element?: EditingElement | null) => void;
  /** Mở stamp MỚI kèm dữ liệu gieo. Kind không đăng ký / readOnly ⇒ bỏ qua. */
  openStampWithSeed: (kind: string, seed: unknown) => void;
  closeStamp: () => void;
  toggleStampByKind: (kind: string) => void;
}

export function useActiveStamp(opts: UseActiveStampOptions): UseActiveStampResult {
  const { readOnly, stamps } = opts;
  const [activeStamp, setActiveStamp] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<EditingElement | null>(null);
  // Mọi đường mở/đóng KHÁC phải xoá seed — sót một chỗ là lần mở stamp sau
  // (vd bấm nút toolbar) hiện lại hàm của lần chuyển trước.
  const [seedCustomData, setSeedCustomData] = useState<unknown>(undefined);
  const [session, setSession] = useState(0);
  const sessionRef = useRef(0);
  const batDauPhien = useCallback(() => {
    sessionRef.current += 1;
    setSession(sessionRef.current);
  }, []);

  const stampByKind = useMemo(() => {
    const m = new Map<string, StampType>();
    for (const s of stamps) m.set(s.kind, s);
    return m;
  }, [stamps]);

  const activeStampDef = activeStamp ? stampByKind.get(activeStamp) ?? null : null;
  const HostComponent = activeStampDef?.Host ?? null;

  const openStamp = useCallback(
    (kind: string, element: EditingElement | null = null) => {
      if (readOnly) return;
      if (!stampByKind.has(kind)) return;
      setEditingElement(element);
      setSeedCustomData(undefined);
      batDauPhien();
      setActiveStamp(kind);
    },
    [readOnly, stampByKind, batDauPhien],
  );

  const openStampWithSeed = useCallback(
    (kind: string, seed: unknown) => {
      if (readOnly) return;
      if (!stampByKind.has(kind)) return;
      setEditingElement(null);
      setSeedCustomData(seed);
      batDauPhien();
      setActiveStamp(kind);
    },
    [readOnly, stampByKind, batDauPhien],
  );

  const closeStamp = useCallback(() => {
    setActiveStamp(null);
    setEditingElement(null);
    setSeedCustomData(undefined);
  }, []);

  const toggleStampByKind = useCallback(
    (kind: string) => {
      setActiveStamp((cur) => {
        if (cur === kind) {
          setEditingElement(null);
          setSeedCustomData(undefined);
          return null;
        }
        if (readOnly) return cur;
        if (!stampByKind.has(kind)) return cur;
        setEditingElement(null);
        setSeedCustomData(undefined);
        batDauPhien();
        return kind;
      });
    },
    [readOnly, stampByKind, batDauPhien],
  );

  const closeStampIfSession = useCallback(
    (s: number) => {
      if (sessionRef.current === s) closeStamp();
    },
    [closeStamp],
  );

  return {
    activeStamp,
    editingElement,
    seedCustomData,
    session,
    closeStampIfSession,
    stampByKind,
    activeStampDef,
    HostComponent,
    openStamp,
    openStampWithSeed,
    closeStamp,
    toggleStampByKind,
  };
}
