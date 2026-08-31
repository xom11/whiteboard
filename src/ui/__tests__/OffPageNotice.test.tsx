import { act, render } from '@testing-library/react';

import { OffPageNotice } from '../OffPageNotice';

/** API Excalidraw giả, đủ cho những gì OffPageNotice chạm vào. */
function fakeApi(elements: unknown[]) {
  const listeners: Array<() => void> = [];
  return {
    api: {
      getSceneElements: () => elements,
      onChange: (cb: () => void) => {
        listeners.push(cb);
        return () => {
          const i = listeners.indexOf(cb);
          if (i >= 0) listeners.splice(i, 1);
        };
      },
    },
    fire: () => listeners.forEach((cb) => cb()),
    listenerCount: () => listeners.length,
  };
}

const inside = [{ x: 10, y: 10, width: 100, height: 100 }];
const outside = [{ x: -500, y: 10, width: 100, height: 100 }];

describe('OffPageNotice', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('tắt nền kẻ dòng thì không bao giờ hiện', () => {
    const { api } = fakeApi(outside);
    const { container } = render(<OffPageNotice api={api} enabled={false} />);
    expect(container.querySelector('.wb-offpage-notice')).toBeNull();
  });

  test('bật mà mọi thứ nằm trong trang thì im lặng', () => {
    const { api } = fakeApi(inside);
    const { container } = render(<OffPageNotice api={api} enabled />);
    expect(container.querySelector('.wb-offpage-notice')).toBeNull();
  });

  test('bật mà có nội dung ngoài trang thì báo ngay', () => {
    const { api } = fakeApi(outside);
    const { container } = render(<OffPageNotice api={api} enabled />);
    const notice = container.querySelector('.wb-offpage-notice');
    expect(notice).not.toBeNull();
    expect(notice!.textContent).toContain('ngoài trang');
    expect(notice!.getAttribute('aria-live')).toBe('polite');
  });

  test('nội dung chèn SAU khi bật cũng được bắt, sau khi hết tiết lưu', () => {
    const elements: unknown[] = [...inside];
    const { api, fire } = fakeApi(elements);
    const { container } = render(<OffPageNotice api={api} enabled />);
    expect(container.querySelector('.wb-offpage-notice')).toBeNull();

    // Giáo viên import một trang PDF quá khổ.
    elements.push({ x: 2000, y: 10, width: 800, height: 600 });
    act(() => {
      fire();
    });
    // Chưa tới hạn tiết lưu thì chưa dò lại.
    expect(container.querySelector('.wb-offpage-notice')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(container.querySelector('.wb-offpage-notice')).not.toBeNull();
  });

  test('unmount thì gỡ listener và không còn hẹn giờ treo', () => {
    const { api, fire, listenerCount } = fakeApi([...inside]);
    const { unmount } = render(<OffPageNotice api={api} enabled />);
    act(() => {
      fire();
    });
    unmount();
    expect(listenerCount()).toBe(0);
    // Hẹn giờ còn treo sẽ setState sau unmount → React cảnh báo. Không được có.
    expect(() => jest.advanceTimersByTime(1000)).not.toThrow();
  });
});
