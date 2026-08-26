import {
  DEFAULT_TOOLBAR_POSITION,
  SNAP_PX,
  TOOLBAR_POSITION_STORAGE_KEY,
  clampFloat,
  isVerticalPosition,
  loadToolbarPosition,
  resolveDrop,
  saveToolbarPosition,
} from '../toolbarPosition';

/** Khung tham chiếu giả lập `.FixedSideContainer_side_top` ở 1280x720. */
const FRAME = { width: 1248, height: 688 };
/** Toolbar ngang mặc định của Excalidraw 0.18 (đo thật bằng Playwright). */
const HORIZONTAL = { width: 550, height: 44 };
/** Toolbar sau khi lật dọc (đảo hai chiều). */
const VERTICAL = { width: 44, height: 550 };

describe('clampFloat', () => {
  it('giữ nguyên toạ độ đã nằm trong khung', () => {
    expect(clampFloat(300, 200, HORIZONTAL, FRAME)).toEqual({ x: 300, y: 200 });
  });

  it('kẹp toạ độ âm về 0', () => {
    expect(clampFloat(-50, -10, HORIZONTAL, FRAME)).toEqual({ x: 0, y: 0 });
  });

  it('kẹp theo mép phải/dưới để toolbar không lòi ra ngoài', () => {
    expect(clampFloat(2000, 2000, HORIZONTAL, FRAME)).toEqual({
      x: FRAME.width - HORIZONTAL.width,
      y: FRAME.height - HORIZONTAL.height,
    });
  });

  it('toolbar to hơn khung thì dồn về 0 chứ không ra số âm', () => {
    const huge = { width: 2000, height: 2000 };
    expect(clampFloat(100, 100, huge, FRAME)).toEqual({ x: 0, y: 0 });
  });
});

describe('resolveDrop', () => {
  it('thả sát mép trái → dock trái', () => {
    const pos = resolveDrop({ x: 4, y: 300, ...HORIZONTAL }, FRAME);
    expect(pos).toEqual({ mode: 'dock', side: 'left' });
  });

  it('thả sát mép phải → dock phải', () => {
    const x = FRAME.width - HORIZONTAL.width - 5;
    const pos = resolveDrop({ x, y: 300, ...HORIZONTAL }, FRAME);
    expect(pos).toEqual({ mode: 'dock', side: 'right' });
  });

  it('thả sát mép dưới → dock dưới', () => {
    const y = FRAME.height - HORIZONTAL.height - 10;
    const pos = resolveDrop({ x: 350, y, ...HORIZONTAL }, FRAME);
    expect(pos).toEqual({ mode: 'dock', side: 'bottom' });
  });

  it('thả gần mép trên → về mặc định dock trên', () => {
    const pos = resolveDrop({ x: 350, y: 12, ...HORIZONTAL }, FRAME);
    expect(pos).toEqual(DEFAULT_TOOLBAR_POSITION);
  });

  it('thả giữa canvas → nổi tự do tại chỗ', () => {
    const pos = resolveDrop({ x: 350, y: 300, ...HORIZONTAL }, FRAME);
    expect(pos).toEqual({ mode: 'float', x: 350, y: 300 });
  });

  it('vị trí gốc (toolbar ngang canh giữa mép trên) vẫn ra dock trên', () => {
    const x = (FRAME.width - HORIZONTAL.width) / 2;
    expect(resolveDrop({ x, y: 0, ...HORIZONTAL }, FRAME)).toEqual(
      DEFAULT_TOOLBAR_POSITION,
    );
  });

  it('ngay ngoài ngưỡng hít thì KHÔNG dock', () => {
    const pos = resolveDrop({ x: SNAP_PX + 1, y: 300, ...HORIZONTAL }, FRAME);
    expect(pos.mode).toBe('float');
  });

  it('đúng ngưỡng hít thì dock', () => {
    const pos = resolveDrop({ x: SNAP_PX, y: 300, ...HORIZONTAL }, FRAME);
    expect(pos).toEqual({ mode: 'dock', side: 'left' });
  });

  it('toolbar đang dọc kéo về mép trên vẫn dock trên (lật lại ngang)', () => {
    const pos = resolveDrop({ x: 400, y: 6, ...VERTICAL }, FRAME);
    expect(pos).toEqual(DEFAULT_TOOLBAR_POSITION);
  });

  it('thả lòi hẳn ra ngoài mép phải → dock phải chứ không nổi ngoài khung', () => {
    const pos = resolveDrop(
      { x: FRAME.width - 100, y: 300, ...HORIZONTAL },
      FRAME,
    );
    // Cách mép phải 100-550 < 0 → dLeft/dRight nhỏ nhất là dRight (âm) → dock phải.
    expect(pos).toEqual({ mode: 'dock', side: 'right' });
  });

  it('khung 0x0 (chưa layout xong) không làm vỡ, trả về mặc định', () => {
    expect(resolveDrop({ x: 0, y: 0, ...HORIZONTAL }, { width: 0, height: 0 })).toEqual(
      DEFAULT_TOOLBAR_POSITION,
    );
  });
});

describe('isVerticalPosition', () => {
  it.each([
    [{ mode: 'dock', side: 'left' } as const, true],
    [{ mode: 'dock', side: 'right' } as const, true],
    [{ mode: 'dock', side: 'top' } as const, false],
    [{ mode: 'dock', side: 'bottom' } as const, false],
    [{ mode: 'float', x: 1, y: 2 } as const, false],
  ])('%j → %s', (pos, expected) => {
    expect(isVerticalPosition(pos)).toBe(expected);
  });
});

describe('load/saveToolbarPosition', () => {
  let store: Record<string, string>;
  let storage: Storage;

  beforeEach(() => {
    store = {};
    storage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    } as unknown as Storage;
  });

  it('roundtrip dock', () => {
    saveToolbarPosition({ mode: 'dock', side: 'left' }, storage);
    expect(loadToolbarPosition(storage)).toEqual({ mode: 'dock', side: 'left' });
  });

  it('roundtrip float', () => {
    saveToolbarPosition({ mode: 'float', x: 12.5, y: 40 }, storage);
    expect(loadToolbarPosition(storage)).toEqual({ mode: 'float', x: 12.5, y: 40 });
  });

  it('ghi vào đúng khoá cố định, không phụ thuộc scene', () => {
    saveToolbarPosition({ mode: 'dock', side: 'bottom' }, storage);
    expect(Object.keys(store)).toEqual([TOOLBAR_POSITION_STORAGE_KEY]);
  });

  it('chưa có gì → mặc định', () => {
    expect(loadToolbarPosition(storage)).toEqual(DEFAULT_TOOLBAR_POSITION);
  });

  it('JSON hỏng → mặc định', () => {
    store[TOOLBAR_POSITION_STORAGE_KEY] = '{nope';
    expect(loadToolbarPosition(storage)).toEqual(DEFAULT_TOOLBAR_POSITION);
  });

  it.each([
    ['side lạ', '{"mode":"dock","side":"middle"}'],
    ['mode lạ', '{"mode":"orbit"}'],
    ['float thiếu toạ độ', '{"mode":"float","x":10}'],
    ['float toạ độ NaN', '{"mode":"float","x":null,"y":3}'],
    ['không phải object', '"left"'],
    ['null', 'null'],
  ])('dữ liệu hỏng (%s) → mặc định', (_label, raw) => {
    store[TOOLBAR_POSITION_STORAGE_KEY] = raw;
    expect(loadToolbarPosition(storage)).toEqual(DEFAULT_TOOLBAR_POSITION);
  });

  it('storage ném lỗi (Safari private mode) → mặc định, không crash', () => {
    const hostile = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;
    expect(loadToolbarPosition(hostile)).toEqual(DEFAULT_TOOLBAR_POSITION);
    expect(() => saveToolbarPosition({ mode: 'dock', side: 'left' }, hostile)).not.toThrow();
  });

  it('storage null (SSR) → mặc định, không crash', () => {
    expect(loadToolbarPosition(null)).toEqual(DEFAULT_TOOLBAR_POSITION);
    expect(() => saveToolbarPosition({ mode: 'dock', side: 'left' }, null)).not.toThrow();
  });
});
