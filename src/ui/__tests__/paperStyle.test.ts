import {
  DEFAULT_PAPER_STYLE,
  PAPER_LINE_HEIGHT,
  PAPER_MIN_GAP_PX,
  PAPER_STYLE_STORAGE_KEY,
  loadPaperStyle,
  paperMetrics,
  savePaperStyle,
} from '../paperStyle';

/**
 * Nền giấy kẻ dòng chỉ là một lớp CSS sau canvas, nên toàn bộ phần khó
 * (dòng kẻ phải trôi khớp với nội dung khi pan/zoom) nằm ở hàm thuần
 * `paperMetrics`. Test ở đây khoá đúng phép quy đổi scene → screen mà
 * Excalidraw dùng: `screenY = (sceneY - scrollY) * zoom`.
 */
describe('paperMetrics', () => {
  test('scroll 0, zoom 1: dòng kẻ đầu nằm đúng gốc toạ độ scene', () => {
    const m = paperMetrics(0, 1);
    expect(m.visible).toBe(true);
    expect(m.sizePx).toBe(PAPER_LINE_HEIGHT);
    expect(m.offsetPx).toBe(0);
  });

  test('cuộn xuống thì dòng kẻ trôi lên theo đúng quãng đường', () => {
    // sceneY=0 nằm ở screenY=-10 → dòng kẻ nhìn thấy đầu tiên là
    // sceneY=32, tức screenY=22.
    const m = paperMetrics(10, 1);
    expect(m.offsetPx).toBeCloseTo(22);
  });

  test('offset luôn nằm trong [0, sizePx) kể cả khi scroll âm', () => {
    for (const scrollY of [-1000.5, -33, -1, 0, 1, 33, 1000.5]) {
      const m = paperMetrics(scrollY, 1);
      expect(m.offsetPx).toBeGreaterThanOrEqual(0);
      expect(m.offsetPx).toBeLessThan(m.sizePx);
    }
  });

  test('zoom phóng to thì khoảng cách dòng kẻ giãn theo', () => {
    const m = paperMetrics(0, 2);
    expect(m.sizePx).toBe(PAPER_LINE_HEIGHT * 2);
    expect(m.visible).toBe(true);
  });

  test('zoom vẫn dịch offset đúng tỉ lệ', () => {
    // scrollY=10 ở zoom 2 → sceneY=0 ở screenY=-20, dòng kế tiếp
    // (sceneY=32) ở screenY = (32-10)*2 = 44.
    const m = paperMetrics(10, 2);
    expect(m.offsetPx).toBeCloseTo(44);
  });

  test('zoom quá nhỏ thì tắt hẳn thay vì biến thành mảng xám', () => {
    const zoom = (PAPER_MIN_GAP_PX - 1) / PAPER_LINE_HEIGHT;
    const m = paperMetrics(0, zoom);
    expect(m.visible).toBe(false);
  });

  test('đúng ngưỡng tối thiểu thì vẫn vẽ', () => {
    const zoom = PAPER_MIN_GAP_PX / PAPER_LINE_HEIGHT;
    expect(paperMetrics(0, zoom).visible).toBe(true);
  });

  test('zoom 0 hoặc âm không làm vỡ (chia cho 0)', () => {
    expect(paperMetrics(0, 0).visible).toBe(false);
    expect(Number.isFinite(paperMetrics(0, 0).offsetPx)).toBe(true);
    expect(paperMetrics(0, -1).visible).toBe(false);
  });
});

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

describe('lưu lựa chọn nền', () => {
  test('mặc định là bảng trắng trơn như trước', () => {
    expect(DEFAULT_PAPER_STYLE).toBe('none');
    expect(loadPaperStyle(memoryStorage())).toBe('none');
  });

  test('lưu rồi đọc lại ra đúng kiểu đã chọn', () => {
    const s = memoryStorage();
    savePaperStyle('lined', s);
    expect(s.getItem(PAPER_STYLE_STORAGE_KEY)).toBe('lined');
    expect(loadPaperStyle(s)).toBe('lined');
  });

  test('không có storage (SSR / Safari private) thì về mặc định', () => {
    expect(loadPaperStyle(null)).toBe('none');
    expect(() => savePaperStyle('lined', null)).not.toThrow();
  });

  test('giá trị rác trong storage không làm vỡ bảng', () => {
    const s = memoryStorage();
    s.setItem(PAPER_STYLE_STORAGE_KEY, 'kẻ-ô-ly-tự-chế');
    expect(loadPaperStyle(s)).toBe('none');
  });

  test('storage ném lỗi thì nuốt, không làm vỡ bảng', () => {
    const boom = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(loadPaperStyle(boom)).toBe('none');
    expect(() => savePaperStyle('lined', boom)).not.toThrow();
  });
});
