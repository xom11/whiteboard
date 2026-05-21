import { useCallback, useMemo, useState } from 'react';
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
  stampByKind: Map<string, StampType>;
  activeStampDef: StampType | null;
  HostComponent: StampType['Host'] | null;
  openStamp: (kind: string, element?: EditingElement | null) => void;
  closeStamp: () => void;
  toggleStampByKind: (kind: string) => void;
}

export function useActiveStamp(opts: UseActiveStampOptions): UseActiveStampResult {
  const { readOnly, stamps } = opts;
  const [activeStamp, setActiveStamp] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<EditingElement | null>(null);

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
      setActiveStamp(kind);
    },
    [readOnly, stampByKind],
  );

  const closeStamp = useCallback(() => {
    setActiveStamp(null);
    setEditingElement(null);
  }, []);

  const toggleStampByKind = useCallback(
    (kind: string) => {
      setActiveStamp((cur) => {
        if (cur === kind) {
          setEditingElement(null);
          return null;
        }
        if (readOnly) return cur;
        if (!stampByKind.has(kind)) return cur;
        setEditingElement(null);
        return kind;
      });
    },
    [readOnly, stampByKind],
  );

  return {
    activeStamp,
    editingElement,
    stampByKind,
    activeStampDef,
    HostComponent,
    openStamp,
    closeStamp,
    toggleStampByKind,
  };
}
