import { useCallback, useEffect, useRef, useState } from 'react';

interface UseChordShortcutArgs<G extends string> {
  groupOrder: readonly G[];
  tools: ReadonlyArray<{ key: string; group: G }>;
  onSelect: (toolKey: string) => void;
  enabled: boolean;
}

interface UseChordShortcutResult<G extends string> {
  chordGroup: G | null;
  cancel: () => void;
}

const A_CODE = 'a'.charCodeAt(0);

function isFieldFocused(): boolean {
  const ae = (typeof document !== 'undefined'
    ? (document.activeElement as HTMLElement | null)
    : null);
  return !!(
    ae &&
    (ae.tagName === 'INPUT' ||
      ae.tagName === 'TEXTAREA' ||
      ae.isContentEditable)
  );
}

export function useChordShortcut<G extends string>(
  args: UseChordShortcutArgs<G>,
): UseChordShortcutResult<G> {
  const { groupOrder, tools, onSelect, enabled } = args;

  const [chordGroup, setChordGroup] = useState<G | null>(null);

  const groupOrderRef = useRef(groupOrder);
  const toolsRef = useRef(tools);
  const onSelectRef = useRef(onSelect);
  const chordGroupRef = useRef<G | null>(null);

  groupOrderRef.current = groupOrder;
  toolsRef.current = tools;
  onSelectRef.current = onSelect;
  // chordGroupRef được sync ngay trong handler (xem `setChord` dưới đây)
  // thay vì ghi từ render body — nếu ghi ở body sẽ bị React batch hoá khi
  // hai event xảy ra trong cùng một act() (event sau đọc giá trị cũ).

  const cancel = useCallback(() => {
    chordGroupRef.current = null;
    setChordGroup(null);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const setChord = (next: G | null) => {
      chordGroupRef.current = next;
      setChordGroup(next);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isFieldFocused()) return;

      const key = e.key;
      const lower = key.length === 1 ? key.toLowerCase() : key;

      if (key === 'Escape') {
        if (chordGroupRef.current !== null) {
          e.preventDefault();
          e.stopPropagation();
          setChord(null);
        }
        return;
      }

      if (lower.length === 1 && lower >= 'a' && lower <= 'z') {
        const idx = lower.charCodeAt(0) - A_CODE;
        if (idx < groupOrderRef.current.length) {
          e.preventDefault();
          e.stopPropagation();
          setChord(groupOrderRef.current[idx]);
        }
        return;
      }

      if (key >= '1' && key <= '9') {
        const active = chordGroupRef.current;
        if (active === null) return;
        const n = key.charCodeAt(0) - '1'.charCodeAt(0); // 0-indexed
        const toolsInGroup = toolsRef.current.filter(
          (t) => t.group === active,
        );
        e.preventDefault();
        e.stopPropagation();
        if (n < toolsInGroup.length) {
          onSelectRef.current(toolsInGroup[n].key);
        }
        setChord(null);
        return;
      }
    };

    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true });
    };
  }, [enabled]);

  return { chordGroup, cancel };
}
