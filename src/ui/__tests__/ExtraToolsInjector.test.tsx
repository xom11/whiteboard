import { render, act } from '@testing-library/react';
import { ExtraToolsInjector, type WhiteboardExtraTool } from '../ExtraToolsInjector';

const POPOVER = '.App-toolbar__extra-tools-dropdown .dropdown-menu-container';

function makeExcalidrawDOM({ popoverOpen = true }: { popoverOpen?: boolean } = {}) {
  document.body.innerHTML = `
    <div class="excalidraw">
      <div class="App-toolbar">
        <div class="Stack_horizontal">
          <button class="App-toolbar__extra-tools-trigger">More tools</button>
        </div>
      </div>
      ${popoverOpen
        ? '<div class="dropdown-menu App-toolbar__extra-tools-dropdown"><div class="dropdown-menu-container"></div></div>'
        : ''}
    </div>
  `;
}

/** Mở popover "More tools" như Excalidraw: chèn node dropdown vào trong .excalidraw. */
function openPopover() {
  const dd = document.createElement('div');
  dd.className = 'dropdown-menu App-toolbar__extra-tools-dropdown';
  dd.innerHTML = '<div class="dropdown-menu-container"></div>';
  document.querySelector('.excalidraw')!.appendChild(dd);
  return dd;
}

/**
 * Nhường microtask (MutationObserver callback) → chạy rAF → nhường microtask (setMount).
 * advanceTimersByTime gọi ngay trong act sẽ chạy TRƯỚC callback của MutationObserver.
 */
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    jest.advanceTimersByTime(200);
  });
  await act(async () => {
    await Promise.resolve();
  });
};

const tool = (over: Partial<WhiteboardExtraTool> = {}): WhiteboardExtraTool => ({
  key: 'giao-trinh',
  label: 'Chèn từ giáo trình',
  onSelect: jest.fn(),
  ...over,
});

const getItem = () =>
  document.querySelector<HTMLButtonElement>('[data-testid="wb-extra-tool-giao-trinh"]');

describe('ExtraToolsInjector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('render mục của consumer vào popover More tools, đúng nhãn + class dropdown của Excalidraw', async () => {
    makeExcalidrawDOM();
    render(<ExtraToolsInjector enabled tools={[tool()]} />);
    await flush();

    const btn = document.querySelector<HTMLButtonElement>(`${POPOVER} [data-testid="wb-extra-tool-giao-trinh"]`);
    expect(btn).not.toBeNull();
    expect(btn!.getAttribute('aria-label')).toBe('Chèn từ giáo trình');
    expect(btn!.textContent).toContain('Chèn từ giáo trình');
    expect(btn!.className).toContain('dropdown-menu-item');
  });

  it('bấm mục ⇒ đóng popover (bấm trigger) rồi gọi onSelect đúng một lần', async () => {
    makeExcalidrawDOM();
    const onSelect = jest.fn();
    render(<ExtraToolsInjector enabled tools={[tool({ onSelect })]} />);
    await flush();

    const bamTrigger = jest.fn();
    document.querySelector('.App-toolbar__extra-tools-trigger')!.addEventListener('click', bamTrigger);
    await act(async () => {
      getItem()!.click();
    });
    expect(bamTrigger).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('popover mount SAU (mở dropdown) và mount LẠI lần sau ⇒ mục xuất hiện cả hai lần', async () => {
    makeExcalidrawDOM({ popoverOpen: false });
    render(<ExtraToolsInjector enabled tools={[tool()]} />);
    await flush();
    expect(getItem()).toBeNull();

    const lan1 = openPopover();
    await flush();
    expect(getItem()).not.toBeNull();

    lan1.remove(); // Excalidraw gỡ popover khi đóng
    await flush();
    openPopover();
    await flush();
    expect(getItem()).not.toBeNull();
    expect(document.querySelectorAll('#wb-extra-tools-portal-wrapper')).toHaveLength(1);
  });

  it('enabled=false (readOnly) ⇒ không render, không tạo wrapper', async () => {
    makeExcalidrawDOM();
    render(<ExtraToolsInjector enabled={false} tools={[tool()]} />);
    await flush();
    expect(getItem()).toBeNull();
    expect(document.getElementById('wb-extra-tools-portal-wrapper')).toBeNull();
  });

  it('tools rỗng ⇒ không tạo wrapper', async () => {
    makeExcalidrawDOM();
    render(<ExtraToolsInjector enabled tools={[]} />);
    await flush();
    expect(document.getElementById('wb-extra-tools-portal-wrapper')).toBeNull();
  });

  it('đổi nhãn qua rerender ⇒ cập nhật tại chỗ, vẫn một wrapper', async () => {
    makeExcalidrawDOM();
    const { rerender } = render(<ExtraToolsInjector enabled tools={[tool()]} />);
    await flush();
    rerender(<ExtraToolsInjector enabled tools={[tool({ label: 'Mở giáo trình' })]} />);
    await flush();
    expect(getItem()!.textContent).toContain('Mở giáo trình');
    expect(document.querySelectorAll('#wb-extra-tools-portal-wrapper')).toHaveLength(1);
  });

  it('unmount ⇒ gỡ wrapper khỏi popover', async () => {
    makeExcalidrawDOM();
    const { unmount } = render(<ExtraToolsInjector enabled tools={[tool()]} />);
    await flush();
    expect(document.getElementById('wb-extra-tools-portal-wrapper')).not.toBeNull();
    unmount();
    expect(document.getElementById('wb-extra-tools-portal-wrapper')).toBeNull();
  });
});
