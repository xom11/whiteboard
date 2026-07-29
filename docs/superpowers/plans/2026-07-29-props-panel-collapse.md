# Thu gọn panel thuộc tính Excalidraw — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm nút thu gọn cho panel thuộc tính bên trái của Excalidraw (Stroke / Background / Stroke width / Opacity / Layers) để giáo viên lấy lại diện tích bảng — issue [hoctotbachkhoa#528](https://github.com/Hoctotbachkhoa/hoctotbachkhoa/issues/528).

**Architecture:** Một state boolean trong `Whiteboard.tsx` gắn class `wb-props-collapsed` lên wrapper div. CSS thu Island `.App-menu__left` lại thành một tab nhỏ chỉ còn nút toggle. Nút toggle là React portal mount **vào bên trong** Island (pattern portal + `MutationObserver` giống `src/pdf/PdfImporterButton.tsx`). Không đụng `appState` Excalidraw, không đụng scene/persistence.

**Tech Stack:** React 18, TypeScript strict, `@excalidraw/excalidraw@0.18.1`, Jest 29 + jsdom + @testing-library/react, Playwright (Chromium), tsup.

## Global Constraints

- Spec nguồn: `docs/superpowers/specs/2026-07-29-props-panel-collapse-design.md`. Mọi quyết định trái spec phải hỏi lại.
- TypeScript strict, **không** dùng `any` nếu tránh được.
- File có hook/event handler phải mở đầu bằng `'use client';`.
- Commit message tiếng Việt, prefix tiếng Anh (`feat`, `fix`, `test`, `docs`). **KHÔNG** thêm `Co-Authored-By`.
- Mỗi file source có test cạnh nó trong `__tests__/`.
- Chuỗi hiển thị cho người dùng: tiếng Việt ("Ẩn bảng thuộc tính" / "Hiện bảng thuộc tính").
- Selector Excalidraw dùng trong code (đã verify trong bundle 0.18.1, đừng đoán lại):
  - `.App-menu__left` = Island chứa thuộc tính (`CLASSES.SHAPE_ACTIONS_MENU`), CSS gốc: `position: absolute; width: 12.5rem; padding: 0.75rem; overflow-y: auto`.
  - `.panelColumn` = các khối con bên trong Island.
  - `.excalidraw` = root container.
- **Không** persist trạng thái, **không** thêm prop mới cho `WhiteboardProps`, **không** thêm phím tắt, **không** làm mobile, **không** đụng zen mode. (YAGNI — đã chốt với user.)
- Phím `P` đã bị `PdfImporterButton` chiếm; test e2e chọn tool bằng phím `r` (rectangle).

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/ui/PropsPanelToggle.tsx` (mới) | Component nút toggle: tìm Island, tạo wrapper, portal nút vào đó. Không giữ state collapsed. |
| `src/ui/propsPanelToggle.css` (mới) | Style nút + rule thu gọn Island khi wrapper có class `wb-props-collapsed`. |
| `src/ui/__tests__/PropsPanelToggle.test.tsx` (mới) | Unit test DOM/portal/a11y (jsdom). |
| `src/Whiteboard.tsx` (sửa) | State `propsCollapsed`, class trên wrapper, render `<PropsPanelToggle>`. |
| `src/__tests__/Whiteboard.test.tsx` (sửa) | Integration test: click nút → wrapper đổi class. |
| `tests/e2e/props-panel-collapse.spec.ts` (mới) | Verify layout thật: panel co lại/nở ra, kèm screenshot. |
| `CHANGELOG.md` (sửa) | Ghi mục tính năng mới. |

**Vì sao nút nằm BÊN TRONG Island:** `.App-menu__left` là `position: absolute` → nó không chiếm chỗ trong flow của `.App-menu_top__left`. Nếu portal nút thành sibling của Island thì nút sẽ đè lên panel. Đặt nút làm con của Island giải quyết cả hai trạng thái mà không phải tính toạ độ.

---

### Task 1: Component `PropsPanelToggle`

**Files:**
- Create: `src/ui/PropsPanelToggle.tsx`
- Create: `src/ui/propsPanelToggle.css`
- Test: `src/ui/__tests__/PropsPanelToggle.test.tsx`

**Interfaces:**
- Consumes: không có (task đầu tiên).
- Produces:
  ```ts
  export interface PropsPanelToggleProps {
    enabled: boolean;    // false (readOnly) → không mount gì
    collapsed: boolean;  // trạng thái hiện tại, do parent giữ
    onToggle: () => void;
  }
  export function PropsPanelToggle(props: PropsPanelToggleProps): JSX.Element | null;
  ```
  CSS class do task này định nghĩa và Task 2 dựa vào: `wb-props-collapsed` (đặt trên ancestor của `.excalidraw`), `wb-props-toggle-mount` (wrapper), `wb-props-toggle` (button). `data-testid="props-panel-toggle"`.

- [ ] **Step 1: Viết test fail trước**

Tạo `src/ui/__tests__/PropsPanelToggle.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Chạy test để chắc chắn nó FAIL**

Run: `npx jest src/ui/__tests__/PropsPanelToggle.test.tsx`
Expected: FAIL — `Cannot find module '../PropsPanelToggle'`.

- [ ] **Step 3: Viết CSS**

Tạo `src/ui/propsPanelToggle.css`:

```css
/**
 * Nút thu gọn panel thuộc tính của Excalidraw.
 *
 * Nút được portal vào BÊN TRONG Island `.App-menu__left` (Excalidraw 0.18)
 * vì Island là `position: absolute` — sibling sẽ đè lên panel.
 * Class `wb-props-collapsed` do Whiteboard đặt trên wrapper ngoài cùng.
 */

.wb-props-toggle-mount {
  display: contents;
}

.excalidraw .wb-props-toggle {
  position: absolute;
  top: 0.375rem;
  right: 0.375rem;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-on-surface, #1b1b1f);
  cursor: pointer;
}

.excalidraw .wb-props-toggle:hover {
  background: var(--button-hover-bg, rgba(0, 0, 0, 0.06));
}

/* --- Trạng thái thu gọn: Island co lại chỉ còn cái nút --- */

.wb-props-collapsed .excalidraw .App-menu__left {
  width: auto;
  min-width: 0;
  padding: 0.25rem;
  overflow: visible;
}

.wb-props-collapsed .excalidraw .App-menu__left > *:not(.wb-props-toggle-mount) {
  display: none;
}

.wb-props-collapsed .excalidraw .wb-props-toggle {
  position: static;
}
```

- [ ] **Step 4: Viết component**

Tạo `src/ui/PropsPanelToggle.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './propsPanelToggle.css';

export interface PropsPanelToggleProps {
  /** Tắt khi readOnly — không mount portal, gỡ wrapper cũ. */
  enabled: boolean;
  /** Panel đang thu gọn hay không. State do Whiteboard giữ. */
  collapsed: boolean;
  onToggle: () => void;
}

const WRAPPER_CLASS = 'wb-props-toggle-mount';
/** Island chứa thuộc tính (Excalidraw `CLASSES.SHAPE_ACTIONS_MENU`). */
const PANEL_SELECTOR = '.App-menu__left';

/**
 * Nút thu gọn panel thuộc tính (issue hoctotbachkhoa#528).
 *
 * Excalidraw 0.18 không có API ẩn riêng panel này (`UIOptions` chỉ có
 * canvasActions/tools/dockedSidebarBreakpoint), còn zen mode thì ẩn cả
 * undo/redo nên không dùng được. Ở đây ta portal một nút vào bên trong
 * Island rồi thu gọn Island bằng CSS.
 *
 * Panel mount/unmount theo tool đang chọn → MutationObserver dò DOM,
 * cùng pattern với `PdfImporterButton`.
 */
export function PropsPanelToggle({
  enabled,
  collapsed,
  onToggle,
}: PropsPanelToggleProps) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const mountRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const removeWrappers = () => {
      document
        .querySelectorAll('.' + WRAPPER_CLASS)
        .forEach((node) => node.remove());
    };

    if (!enabled) {
      mountRef.current = null;
      setMount(null);
      removeWrappers();
      return;
    }

    let cancelled = false;
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;
    let observedRoot: Element | null = null;

    const apply = (next: HTMLElement | null) => {
      if (cancelled || mountRef.current === next) return;
      mountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setMount(next);
      });
    };

    const findPanel = () => {
      if (cancelled) return;
      const panel = document.querySelector<HTMLElement>(PANEL_SELECTOR);
      if (!panel) {
        apply(null);
        return;
      }
      let wrapper = panel.querySelector<HTMLDivElement>('.' + WRAPPER_CLASS);
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = WRAPPER_CLASS;
        panel.appendChild(wrapper);
      }
      apply(wrapper);
    };

    const attachObserver = () => {
      if (cancelled) return;
      const excalidraw = document.querySelector<HTMLElement>('.excalidraw');
      const nextRoot: Element = excalidraw ?? document.body;
      if (observedRoot === nextRoot) return;
      observer?.disconnect();
      observedRoot = nextRoot;
      observer = new MutationObserver(onMutation);
      observer.observe(nextRoot, { childList: true, subtree: true });
    };

    const onMutation = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (cancelled) return;
        if (observedRoot !== document.querySelector('.excalidraw')) {
          attachObserver();
        }
        findPanel();
      });
    };

    findPanel();
    attachObserver();

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      observer?.disconnect();
      removeWrappers();
    };
  }, [enabled]);

  if (!enabled || !mount) return null;

  const label = collapsed ? 'Hiện bảng thuộc tính' : 'Ẩn bảng thuộc tính';

  return createPortal(
    <button
      type="button"
      className="wb-props-toggle"
      data-testid="props-panel-toggle"
      aria-expanded={!collapsed}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <ChevronIcon direction={collapsed ? 'right' : 'left'} />
    </button>,
    mount,
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'left' ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}
```

- [ ] **Step 5: Chạy test đến khi PASS**

Run: `npx jest src/ui/__tests__/PropsPanelToggle.test.tsx`
Expected: PASS, 6/6.

Nếu test "Island mount muộn" fail: kiểm tra jest có `jest.useFakeTimers()` fake luôn `requestAnimationFrame` (modern fake timers mặc định có). Không tự đổi component sang `setTimeout` để né test.

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck && npx eslint src/ui`
Expected: không lỗi.

- [ ] **Step 7: Commit**

```bash
git add src/ui/PropsPanelToggle.tsx src/ui/propsPanelToggle.css src/ui/__tests__/PropsPanelToggle.test.tsx
git commit -m "feat(ui): component PropsPanelToggle thu gọn panel thuộc tính Excalidraw"
```

---

### Task 2: Wire vào `Whiteboard`

**Files:**
- Modify: `src/Whiteboard.tsx` (import ở dòng 3 + 16-26, wrapper ở dòng 252)
- Test: `src/__tests__/Whiteboard.test.tsx` (thêm describe mới ở cuối file)

**Interfaces:**
- Consumes: `PropsPanelToggle({ enabled, collapsed, onToggle })` từ Task 1; class `wb-props-collapsed` + `data-testid="props-panel-toggle"` từ Task 1.
- Produces: wrapper div ngoài cùng của `Whiteboard` mang class `wb-props-collapsed` khi đang thu gọn. Không thêm prop public nào cho `WhiteboardProps`.

- [ ] **Step 1: Viết test fail trước**

Thêm vào cuối `src/__tests__/Whiteboard.test.tsx` (file đã mock sẵn `@excalidraw/excalidraw` và `fileStore`, giữ nguyên các mock đó):

```tsx
describe('Thu gọn panel thuộc tính', () => {
  /** Mock Excalidraw không render Island thật → dựng tay để portal có chỗ bám. */
  function mountFakeIsland() {
    const root = document.createElement('div');
    root.className = 'excalidraw';
    const island = document.createElement('div');
    island.className = 'Island App-menu__left';
    root.appendChild(island);
    document.body.appendChild(root);
    return root;
  }

  it('click nút toggle thêm/bỏ class wb-props-collapsed trên wrapper', async () => {
    const { container } = render(<Whiteboard storageKey={null} />);
    const root = mountFakeIsland();

    // Chờ MutationObserver + rAF của PropsPanelToggle chạy.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).not.toContain('wb-props-collapsed');

    const btn = document.querySelector<HTMLButtonElement>(
      '[data-testid="props-panel-toggle"]',
    );
    expect(btn).not.toBeNull();

    await act(async () => {
      btn!.click();
    });
    expect(wrapper.className).toContain('wb-props-collapsed');

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[data-testid="props-panel-toggle"]')!
        .click();
    });
    expect(wrapper.className).not.toContain('wb-props-collapsed');

    root.remove();
  });

  it('readOnly → không render nút toggle', async () => {
    render(<Whiteboard storageKey={null} readOnly />);
    const root = mountFakeIsland();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(
      document.querySelector('[data-testid="props-panel-toggle"]'),
    ).toBeNull();
    root.remove();
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó FAIL**

Run: `npx jest src/__tests__/Whiteboard.test.tsx -t "Thu gọn panel"`
Expected: FAIL — không tìm thấy `[data-testid="props-panel-toggle"]` (chưa render component).

- [ ] **Step 3: Sửa `src/Whiteboard.tsx` — import**

Dòng 3, thêm `useState` vào import sẵn có:

```tsx
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
```

Thêm import component ngay sau dòng `import { PageRangeDialog } from './pdf/PageRangeDialog';`:

```tsx
import { PropsPanelToggle } from './ui/PropsPanelToggle';
```

- [ ] **Step 4: Thêm state**

Ngay sau khối `const hostRef = useRef<StampHostHandle | null>(null);` (khoảng dòng 147):

```tsx
  // Thu gọn panel thuộc tính của Excalidraw (issue hoctotbachkhoa#528).
  // Cố ý KHÔNG persist: mỗi lần vào bảng panel hiện lại như cũ.
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const togglePropsPanel = useCallback(() => {
    setPropsCollapsed((v) => !v);
  }, []);
```

- [ ] **Step 5: Gắn class lên wrapper + render nút**

Sửa dòng 252 từ:

```tsx
    <div className={`relative h-full w-full${isDark ? ' theme--dark' : ''}`}>
```

thành:

```tsx
    <div
      className={`relative h-full w-full${isDark ? ' theme--dark' : ''}${
        propsCollapsed ? ' wb-props-collapsed' : ''
      }`}
    >
```

Thêm component ngay sau `<PdfImporterButton ... />`:

```tsx
      <PropsPanelToggle
        enabled={!readOnly}
        collapsed={propsCollapsed}
        onToggle={togglePropsPanel}
      />
```

- [ ] **Step 6: Chạy test đến khi PASS**

Run: `npx jest src/__tests__/Whiteboard.test.tsx`
Expected: PASS toàn bộ file (cả test cũ — không được vỡ test nào).

- [ ] **Step 7: Chạy full suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: toàn bộ xanh. Nếu có test cũ vỡ → sửa code, KHÔNG sửa test cũ cho vừa.

- [ ] **Step 8: Commit**

```bash
git add src/Whiteboard.tsx src/__tests__/Whiteboard.test.tsx
git commit -m "feat(ui): wire nút thu gọn panel thuộc tính vào Whiteboard"
```

---

### Task 3: E2E Playwright — verify layout thật

**Files:**
- Create: `tests/e2e/props-panel-collapse.spec.ts`

**Interfaces:**
- Consumes: `data-testid="props-panel-toggle"` (Task 1), class `wb-props-collapsed` (Task 2), harness vite `npm run e2e:serve` tại `http://127.0.0.1:5173`.
- Produces: không có (test cuối chuỗi).

jsdom không có layout engine nên chỉ e2e mới chứng minh được panel THẬT SỰ co lại. Đây là cổng bắt buộc trước khi kết luận fix xong.

- [ ] **Step 1: Viết spec**

Tạo `tests/e2e/props-panel-collapse.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

/**
 * Issue hoctotbachkhoa#528 — nút thu gọn panel thuộc tính.
 *
 * Đo bằng boundingBox thật: jsdom không có layout nên unit test không
 * chứng minh được panel co lại.
 *
 * Chọn tool bằng phím `r` (rectangle) — KHÔNG dùng `p` vì phím đó đã bị
 * PdfImporterButton chiếm.
 */
test.describe('Thu gọn panel thuộc tính', () => {
  test('nút toggle thu panel về tab nhỏ rồi mở lại', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.excalidraw').first()).toBeVisible({
      timeout: 15_000,
    });

    // Chọn tool hình chữ nhật → Excalidraw hiện panel thuộc tính.
    await page.locator('.excalidraw canvas').first().click({ position: { x: 400, y: 300 } });
    await page.keyboard.press('r');

    const panel = page.locator('.App-menu__left');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.App-menu__left .panelColumn').first()).toBeVisible();

    const expanded = await panel.boundingBox();
    expect(expanded!.width).toBeGreaterThan(150);
    await page.screenshot({ path: 'test-results/props-panel-expanded.png' });

    // Thu gọn.
    const toggle = page.getByTestId('props-panel-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(page.locator('.App-menu__left .panelColumn').first()).toBeHidden();
    const collapsed = await panel.boundingBox();
    expect(collapsed!.width).toBeLessThan(60);
    expect(collapsed!.height).toBeLessThan(60);
    await page.screenshot({ path: 'test-results/props-panel-collapsed.png' });

    // Mở lại.
    await page.getByTestId('props-panel-toggle').click();
    await expect(page.locator('.App-menu__left .panelColumn').first()).toBeVisible();
    const reopened = await panel.boundingBox();
    expect(reopened!.width).toBeGreaterThan(150);
  });

  test('đổi tool khi đang thu gọn: panel remount vẫn ở trạng thái thu gọn', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.excalidraw').first()).toBeVisible({
      timeout: 15_000,
    });

    await page.locator('.excalidraw canvas').first().click({ position: { x: 400, y: 300 } });
    await page.keyboard.press('r');
    await expect(page.locator('.App-menu__left')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('props-panel-toggle').click();
    await expect(page.locator('.App-menu__left .panelColumn').first()).toBeHidden();

    // Về selection (phím v) → Excalidraw gỡ panel, rồi chọn ellipse (phím o).
    await page.keyboard.press('v');
    await page.keyboard.press('o');

    await expect(page.locator('.App-menu__left')).toBeVisible();
    await expect(page.locator('.App-menu__left .panelColumn').first()).toBeHidden();
    const box = await page.locator('.App-menu__left').boundingBox();
    expect(box!.width).toBeLessThan(60);
    await expect(page.getByTestId('props-panel-toggle')).toBeVisible();
  });
});
```

- [ ] **Step 2: Chạy e2e**

Run: `npx playwright test tests/e2e/props-panel-collapse.spec.ts`
Expected: 2/2 PASS.

Lần đầu cần `npx playwright install chromium`.

**Nếu vite trên :5173 là server cũ của worktree khác** → `reuseExistingServer` sẽ test nhầm code cũ. Kiểm tra bằng cách kill server đang chạy rồi chạy lại, hoặc chạy với `CI=1` để Playwright luôn start server mới.

- [ ] **Step 3: Xem screenshot bằng mắt**

Mở `test-results/props-panel-expanded.png` và `test-results/props-panel-collapsed.png`. Kiểm bằng mắt:
- expanded: nút `«` nằm ở góc trên-phải panel, không đè lên nhãn "Nét vẽ"/"Stroke";
- collapsed: chỉ còn một tab vuông nhỏ có mũi tên `»`, không còn viền panel to, không có mảnh UI vỡ nào sót lại.

Nếu nút đè chữ hoặc tab bị méo → chỉnh `top/right/width/height` trong `src/ui/propsPanelToggle.css`, chạy lại Step 2-3.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/props-panel-collapse.spec.ts
git commit -m "test(e2e): verify nút thu gọn panel thuộc tính trên UI thật"
```

---

### Task 4: Tài liệu + cổng kiểm cuối

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `CLAUDE.md` (mục Gotchas)

**Interfaces:**
- Consumes: toàn bộ Task 1-3.
- Produces: không có.

- [ ] **Step 1: Thêm mục CHANGELOG**

Mở `CHANGELOG.md`, thêm vào đầu phần chưa phát hành (giữ nguyên văn phong tiếng Việt sẵn có của file):

```markdown
### Thu gọn panel thuộc tính

Panel thuộc tính bên trái của Excalidraw (Nét vẽ / Nền / Độ dày / Độ mờ / Lớp)
giờ có nút thu gọn ở góc trên-phải. Bấm một lần, panel co lại thành một tab nhỏ,
trả diện tích cho bảng; bấm lại để mở. Trạng thái không lưu — vào lại bảng là panel
hiện như cũ. Undo/redo, thanh công cụ và zoom giữ nguyên (khác với zen mode `Alt+Z`
của Excalidraw — chế độ đó ẩn luôn undo/redo).

Chỉ áp dụng cho desktop; bản mobile dùng bottom sheet nên không chiếm diện tích ngang.
```

- [ ] **Step 2: Ghi gotcha vào CLAUDE.md**

Trong `CLAUDE.md`, mục `## Gotchas` (mục nói về Excalidraw double-click / cleanup unmount), thêm một gạch đầu dòng:

```markdown
- **Ẩn panel thuộc tính = CSS, không có API**: Excalidraw 0.18 không cho ẩn riêng panel thuộc tính (`UIOptions` chỉ có `canvasActions`/`tools`/`dockedSidebarBreakpoint`); zen mode (`zenModeEnabled`, `Alt+Z`) ẩn kèm undo/redo nên không dùng. Giải pháp ở `src/ui/PropsPanelToggle.tsx`: portal nút vào BÊN TRONG Island `.App-menu__left` (Island là `position: absolute` → sibling sẽ đè lên panel), rồi thu Island bằng CSS qua class `wb-props-collapsed` trên wrapper. **Coupling với class nội bộ của Excalidraw** (`.App-menu__left`, `.panelColumn`) → khi bump 0.19 phải chạy `npx playwright test tests/e2e/props-panel-collapse.spec.ts`.
```

- [ ] **Step 3: Cổng kiểm cuối — chạy đủ 4 lệnh**

```bash
npm run typecheck
npm run lint
npm test
npx playwright test tests/e2e/props-panel-collapse.spec.ts
```

Expected: cả 4 xanh. Dán output thật vào báo cáo — không được kết luận "xong" khi chưa chạy.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md CLAUDE.md
git commit -m "docs: ghi nhận nút thu gọn panel thuộc tính + gotcha coupling class Excalidraw"
```

---

## Sau khi xong

- Push lên `main` (repo solo, đã có standing authorization).
- Phát hành khi user muốn: `gh workflow run release.yml --repo xom11/whiteboard` → commit `feat:` sẽ bump minor.
- Consumer `hoctotbachkhoa` tự nhận qua Renovate PR; đóng issue #528 sau khi consumer bump xong.
