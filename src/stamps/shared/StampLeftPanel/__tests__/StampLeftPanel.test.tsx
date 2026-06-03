import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StampLeftPanel } from '../index';
import type { StampToolDef } from '../types';
import { createStore } from '../../../../core/scene/store';
import { registerKind, getKind } from '../../../../core/scene/registry';
import type { SceneObject, State } from '../../../../core/scene/types';

// ===== Test fixtures =====

const FAKE_KIND = 'fake-stampleftpanel';
try { getKind(FAKE_KIND); } catch {
  registerKind({
    type: FAKE_KIND,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (obj) => `${obj.label} desc`,
    render: () => ({}),
  });
}

function makeObj(id: string, label: string): SceneObject {
  return {
    id, kind: FAKE_KIND, label, visible: true, locked: false,
    layer: 'default', schemaVersion: 1, attrs: {},
  };
}

function emptyState(): State {
  return { objects: {}, order: [], counter: 0, meta: { domain: '2d', version: 1 } };
}

type TKey = 'move' | 'point' | 'line';
type TGroup = 'basic' | 'draw';

const TOOLS: ReadonlyArray<StampToolDef<TKey, TGroup>> = [
  { key: 'move',  label: 'Di chuyển', icon: <span data-icon="move">M</span>,  group: 'basic' },
  { key: 'point', label: 'Điểm',      icon: <span data-icon="point">P</span>, group: 'basic' },
  { key: 'line',  label: 'Đường',     icon: <span data-icon="line">L</span>,  group: 'draw' },
];

const GROUP_ORDER: TGroup[] = ['basic', 'draw'];
const GROUP_LABELS: Record<TGroup, string> = { basic: 'Cơ bản', draw: 'Vẽ' };

const ICON_HEADER = <span data-testid="hdr">★</span>;

function baseProps(over: Partial<React.ComponentProps<typeof StampLeftPanel<TKey, TGroup>>> = {}) {
  return {
    title: 'Stamp',
    icon: ICON_HEADER,
    onClose: jest.fn(),
    tools: TOOLS,
    groupOrder: GROUP_ORDER,
    groupLabels: GROUP_LABELS,
    activeTool: 'move' as TKey,
    onToolChange: jest.fn(),
    ...over,
  };
}

// ===== Tests =====

describe('StampLeftPanel — desktop smoke', () => {
  test('renders title + icon + tool buttons grouped', () => {
    render(<StampLeftPanel {...baseProps()} />);
    expect(screen.getByText('Stamp')).toBeInTheDocument();
    expect(screen.getByText('Cơ bản')).toBeInTheDocument();
    expect(screen.getByText('Vẽ')).toBeInTheDocument();
    // 3 buttons rendered
    expect(screen.getByLabelText('Di chuyển')).toBeInTheDocument();
    expect(screen.getByLabelText('Điểm')).toBeInTheDocument();
    expect(screen.getByLabelText('Đường')).toBeInTheDocument();
  });

  test('aria-pressed reflects activeTool', () => {
    render(<StampLeftPanel {...baseProps({ activeTool: 'point' })} />);
    expect(screen.getByLabelText('Di chuyển')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Điểm')).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking a tool fires onToolChange', () => {
    const onToolChange = jest.fn();
    render(<StampLeftPanel {...baseProps({ onToolChange })} />);
    fireEvent.click(screen.getByLabelText('Điểm'));
    expect(onToolChange).toHaveBeenCalledWith('point');
  });

  test('no tablist when objects prop missing', () => {
    render(<StampLeftPanel {...baseProps()} />);
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});

describe('StampLeftPanel — axis/grid section', () => {
  test('no section when view + history both undefined', () => {
    render(<StampLeftPanel {...baseProps()} />);
    expect(screen.queryByTestId('toggle-axis')).toBeNull();
    expect(screen.queryByTestId('undo-btn')).toBeNull();
  });

  test('renders axis/grid checkbox when view passed', () => {
    const onShowAxisChange = jest.fn();
    const onShowGridChange = jest.fn();
    render(<StampLeftPanel {...baseProps({
      view: {
        showAxis: true,
        showGrid: false,
        onShowAxisChange,
        onShowGridChange,
      },
    })} />);
    const axis = screen.getByTestId('toggle-axis') as HTMLInputElement;
    const grid = screen.getByTestId('toggle-grid') as HTMLInputElement;
    expect(axis.checked).toBe(true);
    expect(grid.checked).toBe(false);
    fireEvent.click(grid);
    expect(onShowGridChange).toHaveBeenCalledWith(true);
  });

  test('renders undo/redo when history passed, disabled state correct', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    render(<StampLeftPanel {...baseProps({
      history: { onUndo, canUndo: true, onRedo, canRedo: false },
    })} />);
    const undo = screen.getByTestId('undo-btn');
    const redo = screen.getByTestId('redo-btn');
    expect(undo).not.toBeDisabled();
    expect(redo).toBeDisabled();
    fireEvent.click(undo);
    expect(onUndo).toHaveBeenCalled();
  });

  test('custom section/axis/grid labels respected', () => {
    render(<StampLeftPanel {...baseProps({
      view: {
        sectionLabel: 'Góc nhìn',
        axisLabel: 'Trục toạ độ',
        gridLabel: 'Lưới mờ',
        showAxis: false,
        showGrid: false,
        onShowAxisChange: () => {},
        onShowGridChange: () => {},
      },
    })} />);
    expect(screen.getByText('Góc nhìn')).toBeInTheDocument();
    expect(screen.getByText('Trục toạ độ')).toBeInTheDocument();
    expect(screen.getByText('Lưới mờ')).toBeInTheDocument();
  });
});

describe('StampLeftPanel — chord highlight (visual badges đã bị bỏ v0.27)', () => {
  test('group has data-chord-active="true" when chord.activeGroup matches', () => {
    render(<StampLeftPanel {...baseProps({
      chord: { activeGroup: 'basic', letterForGroup: () => 'B' },
    })} />);
    const sections = document.querySelectorAll('[data-chord-group]');
    const basic = Array.from(sections).find((s) => s.getAttribute('data-chord-group') === 'basic');
    const draw = Array.from(sections).find((s) => s.getAttribute('data-chord-group') === 'draw');
    expect(basic?.getAttribute('data-chord-active')).toBe('true');
    expect(draw?.getAttribute('data-chord-active')).toBe('false');
  });

  test('letter/number badge + chord-hint footer KHÔNG còn render dù chord active', () => {
    render(<StampLeftPanel {...baseProps({
      chord: { activeGroup: 'draw', letterForGroup: (g) => g === 'draw' ? 'D' : 'B' },
    })} />);
    expect(screen.queryByTestId('chord-hint')).toBeNull();
    expect(screen.queryByTestId('chord-letter-draw')).toBeNull();
    expect(screen.queryByTestId('chord-num-line')).toBeNull();
  });

  test('no chord-letter badges when chord prop omitted', () => {
    render(<StampLeftPanel {...baseProps()} />);
    expect(screen.queryByTestId('chord-letter-basic')).toBeNull();
    expect(screen.queryByTestId('chord-num-move')).toBeNull();
  });
});

describe('StampLeftPanel — search input', () => {
  test('search box hiện ở desktop, filter theo label', () => {
    render(<StampLeftPanel {...baseProps()} />);
    const input = screen.getByTestId('tool-search-input') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Trước filter: cả 3 tool đều render.
    expect(screen.getByLabelText('Di chuyển')).toBeInTheDocument();
    expect(screen.getByLabelText('Điểm')).toBeInTheDocument();
    expect(screen.getByLabelText('Đường')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'điểm' } });
    expect(screen.getByLabelText('Điểm')).toBeInTheDocument();
    expect(screen.queryByLabelText('Di chuyển')).toBeNull();
    expect(screen.queryByLabelText('Đường')).toBeNull();
  });

  test('search ignore diacritics + case ("diem" khớp "Điểm")', () => {
    render(<StampLeftPanel {...baseProps()} />);
    const input = screen.getByTestId('tool-search-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'diem' } });
    expect(screen.getByLabelText('Điểm')).toBeInTheDocument();
    expect(screen.queryByLabelText('Đường')).toBeNull();
  });

  test('không khớp → hiện empty hint', () => {
    render(<StampLeftPanel {...baseProps()} />);
    const input = screen.getByTestId('tool-search-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'zzz-nothing' } });
    expect(screen.getByTestId('tool-search-empty')).toBeInTheDocument();
    expect(screen.queryByLabelText('Di chuyển')).toBeNull();
  });

  test('nút clear reset query', () => {
    render(<StampLeftPanel {...baseProps()} />);
    const input = screen.getByTestId('tool-search-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'điểm' } });
    expect(screen.queryByLabelText('Di chuyển')).toBeNull();
    fireEvent.click(screen.getByTestId('tool-search-clear'));
    expect(input.value).toBe('');
    expect(screen.getByLabelText('Di chuyển')).toBeInTheDocument();
  });
});

describe('StampLeftPanel — resizable handle', () => {
  beforeEach(() => {
    try { window.localStorage.clear(); } catch { /* ignore */ }
  });

  test('resize handle render với role separator', () => {
    render(<StampLeftPanel {...baseProps()} />);
    const handle = screen.getByTestId('left-panel-resizer');
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute('role', 'separator');
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
  });

  test('mousedown → mousemove cập nhật width inline style', () => {
    render(<StampLeftPanel {...baseProps()} />);
    const aside = screen.getByTestId('stamp-left-panel') as HTMLElement;
    const handle = screen.getByTestId('left-panel-resizer');

    const initial = aside.style.width;
    expect(initial).toMatch(/^\d+px$/);

    fireEvent.mouseDown(handle, { clientX: 240 });
    fireEvent.mouseMove(window, { clientX: 340 });

    expect(parseInt(aside.style.width, 10)).toBeGreaterThan(parseInt(initial, 10));

    fireEvent.mouseUp(window);
  });

  test('width clamp ở max 480px', () => {
    render(<StampLeftPanel {...baseProps()} />);
    const aside = screen.getByTestId('stamp-left-panel') as HTMLElement;
    const handle = screen.getByTestId('left-panel-resizer');
    fireEvent.mouseDown(handle, { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 10000 });
    expect(parseInt(aside.style.width, 10)).toBeLessThanOrEqual(480);
    fireEvent.mouseUp(window);
  });

  test('width clamp ở min 220px', () => {
    render(<StampLeftPanel {...baseProps()} />);
    const aside = screen.getByTestId('stamp-left-panel') as HTMLElement;
    const handle = screen.getByTestId('left-panel-resizer');
    fireEvent.mouseDown(handle, { clientX: 1000 });
    fireEvent.mouseMove(window, { clientX: -1000 });
    expect(parseInt(aside.style.width, 10)).toBeGreaterThanOrEqual(220);
    fireEvent.mouseUp(window);
  });

  test('double-click handle reset về default 240px', () => {
    render(<StampLeftPanel {...baseProps()} />);
    const aside = screen.getByTestId('stamp-left-panel') as HTMLElement;
    const handle = screen.getByTestId('left-panel-resizer');
    fireEvent.mouseDown(handle, { clientX: 240 });
    fireEvent.mouseMove(window, { clientX: 400 });
    fireEvent.mouseUp(window);
    expect(parseInt(aside.style.width, 10)).not.toBe(240);

    fireEvent.doubleClick(handle);
    expect(aside.style.width).toBe('240px');
  });
});

describe('StampLeftPanel — objects tab', () => {
  function makeStoreWithObjs(ids: string[]) {
    const state = emptyState();
    for (const id of ids) {
      state.objects[id] = makeObj(id, id);
      state.order.push(id);
    }
    return createStore(state);
  }

  test('renders 2 tabs when objects prop passed', () => {
    const store = makeStoreWithObjs([]);
    render(<StampLeftPanel {...baseProps({
      objects: { store },
    })} />);
    expect(screen.getByTestId('tab-tools')).toBeInTheDocument();
    expect(screen.getByTestId('tab-objects')).toBeInTheDocument();
  });

  test('switching to objects tab shows ObjectListPanel + addButtons', () => {
    const store = makeStoreWithObjs(['X']);
    const addFn = jest.fn();
    render(<StampLeftPanel {...baseProps({
      objects: {
        store,
        addButtons: [{ label: '+ Hàm', testId: 'add-fn-btn', onClick: addFn }],
      },
    })} />);
    fireEvent.click(screen.getByTestId('tab-objects'));
    expect(screen.getByTestId('objects-panel')).toBeInTheDocument();
    const addBtn = screen.getByTestId('add-fn-btn');
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);
    expect(addFn).toHaveBeenCalled();
    // ObjectListPanel render row for X
    expect(screen.getByTestId('object-row-X')).toBeInTheDocument();
  });

  test('custom renderRow used when provided', () => {
    const store = makeStoreWithObjs(['Y']);
    const renderRow = jest.fn((obj: SceneObject) => (
      <div key={obj.id} data-testid={`custom-row-${obj.id}`}>{obj.label}</div>
    ));
    render(<StampLeftPanel {...baseProps({
      objects: { store, renderRow },
    })} />);
    fireEvent.click(screen.getByTestId('tab-objects'));
    expect(screen.getByTestId('custom-row-Y')).toBeInTheDocument();
    expect(renderRow).toHaveBeenCalled();
  });
});

describe('StampLeftPanel — mobile', () => {
  test('isMobile renders MobileToolDrawer with drawer state', () => {
    render(<StampLeftPanel {...baseProps({
      isMobile: true,
      drawerOpen: true,
      onDrawerClose: jest.fn(),
    })} />);
    // MobileToolDrawer renders aside with data-mobile-drawer="true"
    const drawer = document.querySelector('[data-mobile-drawer="true"]');
    expect(drawer).not.toBeNull();
    expect(drawer?.getAttribute('data-drawer-state')).toBe('open');
  });

  test('mobile chips render when view prop passed', () => {
    render(<StampLeftPanel {...baseProps({
      isMobile: true,
      drawerOpen: true,
      view: {
        showAxis: true,
        showGrid: false,
        onShowAxisChange: () => {},
        onShowGridChange: () => {},
      },
    })} />);
    expect(screen.getByTestId('toggle-axis')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-grid')).toBeInTheDocument();
  });

  test('mobile actions render when history prop passed', () => {
    render(<StampLeftPanel {...baseProps({
      isMobile: true,
      drawerOpen: true,
      history: { onUndo: () => {}, canUndo: true, onRedo: () => {}, canRedo: true },
    })} />);
    expect(screen.getByTestId('undo-btn')).toBeInTheDocument();
    expect(screen.getByTestId('redo-btn')).toBeInTheDocument();
  });
});
