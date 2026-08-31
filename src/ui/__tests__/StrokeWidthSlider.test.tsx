import { render, act, fireEvent } from '@testing-library/react';
import { StrokeWidthSlider } from '../StrokeWidthSlider';
import { STROKE_WIDTH_MAX, STROKE_WIDTH_MIN } from '../strokeWidth';

/**
 * DOM tối giản mô phỏng panel thuộc tính Excalidraw 0.18 khi đang chọn công cụ
 * có nét. Hình dạng lấy từ `ButtonIconSelect` (`dist/dev/index.js:2144`):
 * fieldset > legend + .buttonList > label > input[type=radio][data-testid].
 */
function mountPanelDOM() {
  document.body.innerHTML = `
    <div class="excalidraw">
      <div class="Island App-menu__left">
        <div class="panelColumn">
          <fieldset class="wb-other-fieldset">
            <legend>Nét vẽ</legend>
            <div class="buttonList"><label><input type="radio" name="stroke" /></label></div>
          </fieldset>
          <fieldset>
            <legend>Độ dày nét</legend>
            <div class="buttonList">
              <label><input type="radio" name="stroke-width" data-testid="strokeWidth-thin" /></label>
              <label><input type="radio" name="stroke-width" data-testid="strokeWidth-bold" /></label>
              <label><input type="radio" name="stroke-width" data-testid="strokeWidth-extraBold" /></label>
            </div>
          </fieldset>
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

const getSlider = () =>
  document.querySelector<HTMLInputElement>('[data-testid="wb-stroke-width-slider"]');

const strokeFieldset = () =>
  document
    .querySelector('[data-testid="strokeWidth-thin"]')!
    .closest('fieldset') as HTMLFieldSetElement;

describe('StrokeWidthSlider', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('portal slider vào ĐÚNG fieldset độ dày nét, không phải fieldset khác', async () => {
    mountPanelDOM();
    render(<StrokeWidthSlider enabled value={2} onChange={() => {}} />);
    await flush();

    const slider = getSlider();
    expect(slider).not.toBeNull();
    expect(slider!.closest('fieldset')).toBe(strokeFieldset());
    // Neo phải là chính hàng nút độ dày nét — nếu bám nhầm fieldset đầu tiên
    // thì slider sẽ nhảy sang "Nét vẽ".
    expect(slider!.closest('fieldset')!.querySelector('.wb-other-fieldset')).toBeNull();
  });

  it('đánh dấu fieldset để CSS ẩn hàng 3 nút gốc', async () => {
    mountPanelDOM();
    render(<StrokeWidthSlider enabled value={2} onChange={() => {}} />);
    await flush();

    expect(strokeFieldset().classList.contains('wb-stroke-width-fieldset')).toBe(true);
    // Hàng nút gốc vẫn còn trong DOM (Excalidraw sở hữu nó) — ta chỉ ẩn bằng CSS.
    expect(strokeFieldset().querySelector('.buttonList')).not.toBeNull();
  });

  it('dải trượt phủ đúng min→max của thang', async () => {
    mountPanelDOM();
    render(<StrokeWidthSlider enabled value={2} onChange={() => {}} />);
    await flush();

    expect(getSlider()!.min).toBe(String(STROKE_WIDTH_MIN));
    expect(getSlider()!.max).toBe(String(STROKE_WIDTH_MAX));
  });

  it('kéo slider → onChange nhận giá trị đã hút nấc', async () => {
    mountPanelDOM();
    const onChange = jest.fn();
    render(<StrokeWidthSlider enabled value={2} onChange={onChange} />);
    await flush();

    await act(async () => {
      fireEvent.change(getSlider()!, { target: { value: '0.4' } });
    });

    expect(onChange).toHaveBeenCalledWith(0.5);
  });

  it('hiện giá trị đang chọn ở bong bóng', async () => {
    mountPanelDOM();
    const { rerender } = render(
      <StrokeWidthSlider enabled value={0.5} onChange={() => {}} />,
    );
    await flush();
    expect(document.querySelector('.wb-stroke-width-bubble')!.textContent).toBe('0.5');

    rerender(<StrokeWidthSlider enabled value={4} onChange={() => {}} />);
    await flush();
    expect(document.querySelector('.wb-stroke-width-bubble')!.textContent).toBe('4');
  });

  it('value=null (selection lẫn lộn) → bong bóng rỗng, slider vẫn dùng được', async () => {
    mountPanelDOM();
    render(<StrokeWidthSlider enabled value={null} onChange={() => {}} />);
    await flush();

    expect(getSlider()).not.toBeNull();
    expect(document.querySelector('.wb-stroke-width-bubble')!.textContent).toBe('');
  });

  it('enabled=false → không mount và dọn sạch dấu vết', async () => {
    mountPanelDOM();
    const { rerender } = render(
      <StrokeWidthSlider enabled value={2} onChange={() => {}} />,
    );
    await flush();
    expect(getSlider()).not.toBeNull();

    rerender(<StrokeWidthSlider enabled={false} value={2} onChange={() => {}} />);
    await flush();

    expect(getSlider()).toBeNull();
    // Không được để lại class ẩn — nếu không, hàng nút gốc biến mất vĩnh viễn
    // ở chế độ readOnly.
    expect(strokeFieldset().classList.contains('wb-stroke-width-fieldset')).toBe(false);
  });

  it('panel biến mất rồi hiện lại (đổi tool) → slider mount lại', async () => {
    mountPanelDOM();
    render(<StrokeWidthSlider enabled value={2} onChange={() => {}} />);
    await flush();
    expect(getSlider()).not.toBeNull();

    await act(async () => {
      document.querySelector('.panelColumn')!.innerHTML = '';
    });
    await flush();
    expect(getSlider()).toBeNull();

    await act(async () => {
      mountPanelDOM();
    });
    await flush();
    expect(getSlider()).not.toBeNull();
    expect(strokeFieldset().classList.contains('wb-stroke-width-fieldset')).toBe(true);
  });

  it('unmount → gỡ class khỏi fieldset của Excalidraw', async () => {
    mountPanelDOM();
    const { unmount } = render(
      <StrokeWidthSlider enabled value={2} onChange={() => {}} />,
    );
    await flush();

    await act(async () => {
      unmount();
    });
    expect(strokeFieldset().classList.contains('wb-stroke-width-fieldset')).toBe(false);
  });
});
