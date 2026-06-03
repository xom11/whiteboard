// Integration test: verify 2D's TOOLS/GROUP_ORDER wire vào StampLeftPanel đúng.
// (Trước Phase 2 từng test trực tiếp GeometryLeftPanel — đã extract sang StampLeftPanel.)
//
// Note v0.27: visual phím tắt A/B/C + 1/2/3 + chord-hint đã bị bỏ. Test chord
// state machine giữ ở `useChordShortcut.test.tsx`; ở đây chỉ giữ assertion
// data-chord-active để confirm group highlight vẫn render đúng.
import { render, screen, fireEvent } from '@testing-library/react';
import { StampLeftPanel } from '../../shared/StampLeftPanel';
import { TOOLS, GROUP_ORDER, GROUP_LABELS, letterForGroup, type GeomGroup } from '../editor/tools';
import type { GeomTool } from '../editor/MiniBoard';

function mount(activeGroup: GeomGroup | null) {
  return render(
    <StampLeftPanel<GeomTool, GeomGroup>
      title="Hình học"
      icon={<span />}
      tools={TOOLS}
      groupOrder={GROUP_ORDER}
      groupLabels={GROUP_LABELS}
      activeTool="move"
      onToolChange={() => {}}
      view={{ showAxis: false, showGrid: false, onShowAxisChange: () => {}, onShowGridChange: () => {} }}
      history={{ onUndo: () => {}, canUndo: false, onRedo: () => {}, canRedo: false }}
      chord={{ activeGroup, letterForGroup }}
      onClose={() => {}}
    />,
  );
}

describe('geometry-2d × StampLeftPanel — chord visuals bị bỏ ở v0.27', () => {
  test('Group header KHÔNG còn badge letter (A, B, C...)', () => {
    const { container } = mount(null);
    expect(container.querySelector('[data-testid="chord-letter-move"]')).toBeNull();
    expect(container.querySelector('[data-testid="chord-letter-point"]')).toBeNull();
    expect(container.querySelector('[data-testid="chord-letter-line"]')).toBeNull();
  });

  test('Tool button KHÔNG còn badge số 1..N', () => {
    const { container } = mount(null);
    expect(container.querySelector('[data-testid="chord-num-segment"]')).toBeNull();
    expect(container.querySelector('[data-testid="chord-num-line"]')).toBeNull();
    expect(container.querySelector('[data-testid="chord-num-ray"]')).toBeNull();
    expect(container.querySelector('[data-testid="chord-num-vector"]')).toBeNull();
  });

  test('chord-hint footer cũng bị bỏ', () => {
    const { container } = mount('point');
    expect(container.querySelector('[data-testid="chord-hint"]')).toBeNull();
  });

  test('chordGroup="point" → section "Điểm" vẫn có data-chord-active="true" (group highlight giữ lại)', () => {
    const { container } = mount('point');
    const activeSection = container.querySelector('[data-chord-group="point"]');
    expect(activeSection?.getAttribute('data-chord-active')).toBe('true');
    const otherSection = container.querySelector('[data-chord-group="move"]');
    expect(otherSection?.getAttribute('data-chord-active')).toBe('false');
  });
});

describe('geometry-2d × StampLeftPanel — Redo button', () => {
  it('hiển thị Redo button với state canRedo', () => {
    const onRedo = jest.fn();
    render(
      <StampLeftPanel<GeomTool, GeomGroup>
        title="Hình học"
        icon={<span />}
        tools={TOOLS}
        groupOrder={GROUP_ORDER}
        groupLabels={GROUP_LABELS}
        activeTool="move"
        onToolChange={() => {}}
        view={{ showAxis: false, showGrid: false, onShowAxisChange: () => {}, onShowGridChange: () => {} }}
        history={{ onUndo: () => {}, canUndo: false, onRedo, canRedo: true }}
        onClose={() => {}}
      />,
    );
    const btn = screen.getByTestId('redo-btn');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('Redo button disabled khi canRedo=false', () => {
    render(
      <StampLeftPanel<GeomTool, GeomGroup>
        title="Hình học"
        icon={<span />}
        tools={TOOLS}
        groupOrder={GROUP_ORDER}
        groupLabels={GROUP_LABELS}
        activeTool="move"
        onToolChange={() => {}}
        view={{ showAxis: false, showGrid: false, onShowAxisChange: () => {}, onShowGridChange: () => {} }}
        history={{ onUndo: () => {}, canUndo: true, onRedo: () => {}, canRedo: false }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId('redo-btn')).toBeDisabled();
  });
});
