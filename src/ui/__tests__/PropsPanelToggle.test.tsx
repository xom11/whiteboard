import { render, act } from '@testing-library/react';
import { PropsPanelToggle } from '../PropsPanelToggle';

/** DOM tối giản mô phỏng Excalidraw 0.18 khi panel thuộc tính đang hiện. */
function mountPanelDOM() {
  document.body.innerHTML = `
    <div class="excalidraw">
      <div class="App-menu App-menu_top">
        <div class="Stack Stack_vertical App-menu_top__left">
          <button class="dropdown-menu-button">menu</button>
          <section class="selected-shape-actions">
            <div class="Island App-menu__left">
              <div class="panelColumn">Stroke</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

const flush = async () => {
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
};

const getButton = () =>
  document.querySelector<HTMLButtonElement>('[data-testid="props-panel-toggle"]');

describe('PropsPanelToggle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('mount nút vào BÊN TRONG Island .App-menu__left', async () => {
    mountPanelDOM();
    render(<PropsPanelToggle enabled collapsed={false} onToggle={() => {}} />);
    await flush();

    const btn = getButton();
    expect(btn).not.toBeNull();
    expect(btn!.closest('.App-menu__left')).not.toBeNull();
  });

  it('click gọi onToggle', async () => {
    mountPanelDOM();
    const onToggle = jest.fn();
    render(<PropsPanelToggle enabled collapsed={false} onToggle={onToggle} />);
    await flush();

    await act(async () => {
      getButton()!.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('aria-expanded + nhãn phản ánh trạng thái collapsed', async () => {
    mountPanelDOM();
    const { rerender } = render(
      <PropsPanelToggle enabled collapsed={false} onToggle={() => {}} />,
    );
    await flush();
    expect(getButton()!.getAttribute('aria-expanded')).toBe('true');
    expect(getButton()!.getAttribute('title')).toBe('Ẩn bảng thuộc tính');

    rerender(<PropsPanelToggle enabled collapsed onToggle={() => {}} />);
    await flush();
    expect(getButton()!.getAttribute('aria-expanded')).toBe('false');
    expect(getButton()!.getAttribute('title')).toBe('Hiện bảng thuộc tính');
  });

  it('không có Island trong DOM → không render nút', async () => {
    document.body.innerHTML = '<div class="excalidraw"></div>';
    render(<PropsPanelToggle enabled collapsed={false} onToggle={() => {}} />);
    await flush();
    expect(getButton()).toBeNull();
  });

  it('Island mount muộn (đổi tool) → nút tự xuất hiện', async () => {
    document.body.innerHTML = '<div class="excalidraw"></div>';
    render(<PropsPanelToggle enabled collapsed={false} onToggle={() => {}} />);
    await flush();
    expect(getButton()).toBeNull();

    await act(async () => {
      const island = document.createElement('div');
      island.className = 'Island App-menu__left';
      document.querySelector('.excalidraw')!.appendChild(island);
    });
    await flush();
    expect(getButton()).not.toBeNull();
  });

  it('enabled=false → không render nút và gỡ wrapper khỏi DOM', async () => {
    mountPanelDOM();
    const { rerender } = render(
      <PropsPanelToggle enabled collapsed={false} onToggle={() => {}} />,
    );
    await flush();
    expect(getButton()).not.toBeNull();

    rerender(<PropsPanelToggle enabled={false} collapsed={false} onToggle={() => {}} />);
    await flush();
    expect(getButton()).toBeNull();
    expect(document.querySelector('.wb-props-toggle-mount')).toBeNull();
  });
});
