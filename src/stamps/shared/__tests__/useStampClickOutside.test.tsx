import { renderHook } from '@testing-library/react';
import { useStampClickOutside } from '../useStampClickOutside';
import type { StampHostHandle } from '../types';

function fire(type: string, target: Element) {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'target', { value: target });
  window.dispatchEvent(ev);
}

describe('useStampClickOutside', () => {
  let outside: HTMLDivElement;
  let inside: HTMLDivElement;
  let onClose: jest.Mock;
  let tryInsert: jest.Mock;
  let hostRef: { current: StampHostHandle | null };

  beforeEach(() => {
    outside = document.createElement('div');
    inside = document.createElement('div');
    const area = document.createElement('div');
    area.setAttribute('data-stamp-area', 'true');
    area.appendChild(inside);
    document.body.appendChild(area);
    document.body.appendChild(outside);
    onClose = jest.fn();
    tryInsert = jest.fn();
    hostRef = { current: { tryInsert, hasContent: () => true } as unknown as StampHostHandle };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('pointerdown ngoài stamp area → tryInsert + onClose', () => {
    renderHook(() => useStampClickOutside({ activeStamp: 'geometry', hostRef, onClose }));
    fire('pointerdown', outside);
    expect(tryInsert).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pointerdown trong stamp area → không đóng', () => {
    renderHook(() => useStampClickOutside({ activeStamp: 'geometry', hostRef, onClose }));
    fire('pointerdown', inside);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('mousedown KHÔNG đóng panel (chỉ nghe pointerdown)', () => {
    // Bug e2e 2026-07-14: double-click mở re-edit → panel mở NGAY TRONG
    // pointerdown thứ 2; React flush effect gắn listener xong thì `mousedown`
    // compat CỦA CÙNG CÚ NHẤN bắn tới → listener thấy target=canvas (ngoài
    // panel) → tự đóng panel vừa mở → MiniBoard unmount giữa async init →
    // JSXGraph "container not found", editor không bao giờ mở được.
    // Browser hiện đại luôn có pointerdown (Excalidraw chạy pointer-events)
    // → mousedown listener là thừa VÀ gây race → hook không được nghe nó.
    renderHook(() => useStampClickOutside({ activeStamp: 'geometry', hostRef, onClose }));
    fire('mousedown', outside);
    expect(onClose).not.toHaveBeenCalled();
    expect(tryInsert).not.toHaveBeenCalled();
  });

  it('activeStamp null → không lắng nghe gì', () => {
    renderHook(() => useStampClickOutside({ activeStamp: null, hostRef, onClose }));
    fire('pointerdown', outside);
    expect(onClose).not.toHaveBeenCalled();
  });
});
