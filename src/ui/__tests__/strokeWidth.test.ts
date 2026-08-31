import {
  DEFAULT_STROKE_WIDTH,
  FREEDRAW_SIZE_FACTOR,
  STROKE_WIDTH_MAX,
  STROKE_WIDTH_MIN,
  STROKE_WIDTH_STEP,
  commonStrokeWidth,
  displayedStrokeWidth,
  snapStrokeWidth,
  strokeWidthStops,
} from '../strokeWidth';

describe('snapStrokeWidth', () => {
  it('hút về nấc gần nhất', () => {
    expect(snapStrokeWidth(0.3)).toBe(0.25);
    expect(snapStrokeWidth(0.4)).toBe(0.5);
    expect(snapStrokeWidth(1.6)).toBe(1.5);
    expect(snapStrokeWidth(1.63)).toBe(1.75);
  });

  it('giữ nguyên 3 mức cũ của Excalidraw — bảng vẽ sẵn không đổi hình', () => {
    // thin/bold/extraBold phải rơi ĐÚNG vào nấc, nếu không thì mở lại bảng cũ
    // là nét bị xê dịch.
    expect(snapStrokeWidth(1)).toBe(1);
    expect(snapStrokeWidth(2)).toBe(2);
    expect(snapStrokeWidth(4)).toBe(4);
  });

  it('kẹp vào [min, max]', () => {
    expect(snapStrokeWidth(99)).toBe(STROKE_WIDTH_MAX);
    expect(snapStrokeWidth(0)).toBe(STROKE_WIDTH_MIN);
    expect(snapStrokeWidth(-5)).toBe(STROKE_WIDTH_MIN);
  });

  it('giá trị không hữu hạn → mặc định của Excalidraw', () => {
    // `+event.target.value` trên input rỗng ra NaN; trả min sẽ là "câu trả lời
    // sai một cách im lặng" (GV tự dưng có nét mảnh nhất).
    expect(snapStrokeWidth(NaN)).toBe(DEFAULT_STROKE_WIDTH);
    expect(snapStrokeWidth(Infinity)).toBe(DEFAULT_STROKE_WIDTH);
  });

  it('mọi nấc đều là số nhị phân chẵn — không có rác dấu phẩy động', () => {
    // step 0.25 là luỹ thừa 2 nên phép nhân/chia không đẻ 0.30000000000000004.
    // Nếu ai đó đổi step thành 0.1 thì test này đỏ, đúng như mong muốn: bong
    // bóng giá trị sẽ hiện "1.7000000000000002".
    for (const v of strokeWidthStops()) {
      expect(String(v)).toMatch(/^\d+(\.\d{1,2})?$/);
      expect(snapStrokeWidth(v)).toBe(v);
    }
  });

  it('dải nấc phủ đúng min→max theo step', () => {
    const stops = strokeWidthStops();
    expect(stops[0]).toBe(STROKE_WIDTH_MIN);
    expect(stops[stops.length - 1]).toBe(STROKE_WIDTH_MAX);
    expect(stops).toHaveLength((STROKE_WIDTH_MAX - STROKE_WIDTH_MIN) / STROKE_WIDTH_STEP + 1);
  });

  it('có nấc MẢNH HƠN mức "thin" cũ — đây là lý do tồn tại của thay đổi này', () => {
    const thinnerThanLegacy = strokeWidthStops().filter((v) => v < 1);
    expect(thinnerThanLegacy).toEqual([0.25, 0.5, 0.75]);
    // Quy ra nét bút tay thật (Excalidraw nhân 4.25 lần cho freedraw).
    expect(0.25 * FREEDRAW_SIZE_FACTOR).toBeCloseTo(1.06, 2);
    expect(1 * FREEDRAW_SIZE_FACTOR).toBeCloseTo(4.25, 2);
  });
});

describe('commonStrokeWidth', () => {
  const el = (id: string, strokeWidth: number, isDeleted = false) => ({
    id,
    strokeWidth,
    isDeleted,
  });

  it('mọi element đang chọn cùng giá trị → trả giá trị đó', () => {
    const els = [el('a', 2), el('b', 2), el('c', 4)];
    expect(commonStrokeWidth(els, { a: true, b: true })).toBe(2);
  });

  it('giá trị lẫn lộn → null (slider không được bịa ra một con số)', () => {
    const els = [el('a', 2), el('b', 4)];
    expect(commonStrokeWidth(els, { a: true, b: true })).toBeNull();
  });

  it('không chọn gì → null để caller rơi về currentItemStrokeWidth', () => {
    expect(commonStrokeWidth([el('a', 2)], {})).toBeNull();
  });

  it('bỏ qua element đã xoá', () => {
    const els = [el('a', 2), el('b', 4, true)];
    expect(commonStrokeWidth(els, { a: true, b: true })).toBe(2);
  });

  it('bỏ qua element không có strokeWidth', () => {
    const els = [el('a', 2), { id: 'b', isDeleted: false }];
    expect(commonStrokeWidth(els, { a: true, b: true })).toBe(2);
  });

  it('chọn toàn element không có strokeWidth → null', () => {
    expect(commonStrokeWidth([{ id: 'a' }], { a: true })).toBeNull();
  });

  it('kẹp giá trị lạ từ scene cũ về trong dải', () => {
    // Scene lưu từ bản cũ (hoặc file .excalidraw ngoài) có thể mang bất kỳ số
    // nào — slider phải hiển thị được, không đẩy thumb ra ngoài track.
    expect(commonStrokeWidth([el('a', 12)], { a: true })).toBe(STROKE_WIDTH_MAX);
  });
});

describe('displayedStrokeWidth', () => {
  const el = (id: string, strokeWidth: number, isDeleted = false) => ({
    id,
    strokeWidth,
    isDeleted,
  });

  it('không chọn gì → nét của công cụ (currentItemStrokeWidth)', () => {
    expect(displayedStrokeWidth([el('a', 4)], {}, 0.5)).toBe(0.5);
  });

  it('chọn các hình cùng nét → nét đó, KHÔNG phải nét công cụ', () => {
    expect(displayedStrokeWidth([el('a', 4), el('b', 4)], { a: true, b: true }, 0.5)).toBe(4);
  });

  it('chọn lẫn lộn → null, KHÔNG rơi về nét công cụ', () => {
    // Đây là điểm phân biệt: cả hai ca đều làm commonStrokeWidth trả null,
    // gộp lại thì slider nhảy về 0.5 mỗi lần GV chọn 2 hình khác nét.
    expect(displayedStrokeWidth([el('a', 4), el('b', 2)], { a: true, b: true }, 0.5)).toBeNull();
  });

  it('chọn toàn hình không có nét (ảnh/frame) → nét công cụ', () => {
    expect(displayedStrokeWidth([{ id: 'a' }], { a: true }, 1.25)).toBe(1.25);
  });

  it('chọn hình đã xoá → coi như không chọn', () => {
    expect(displayedStrokeWidth([el('a', 4, true)], { a: true }, 0.75)).toBe(0.75);
  });

  it('currentItemStrokeWidth thiếu → mặc định Excalidraw', () => {
    // Scene lưu trước khi thêm tính năng này không có field đó.
    expect(displayedStrokeWidth([], {}, undefined)).toBe(DEFAULT_STROKE_WIDTH);
  });
});
