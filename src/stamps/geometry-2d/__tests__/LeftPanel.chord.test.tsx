// Integration test: verify 2D's TOOLS/GROUP_ORDER wire vào StampLeftPanel chord viz đúng.
// (Trước Phase 2 từng test trực tiếp GeometryLeftPanel — đã extract sang StampLeftPanel.)
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

describe('geometry-2d × StampLeftPanel — chord UI', () => {
  test('Group header có badge letter (A, B, C...)', () => {
    const { container } = mount(null);
    expect(container.querySelector('[data-testid="chord-letter-move"]'))
      .toHaveTextContent('A');
    expect(container.querySelector('[data-testid="chord-letter-point"]'))
      .toHaveTextContent('B');
    expect(container.querySelector('[data-testid="chord-letter-line"]'))
      .toHaveTextContent('C');
  });

  test('Tool button có badge số (1..N theo thứ tự trong group)', () => {
    const { container } = mount(null);
    // group "Đường" có 4 tool: segment(1) line(2) ray(3) vector(4)
    expect(container.querySelector('[data-testid="chord-num-segment"]'))
      .toHaveTextContent('1');
    expect(container.querySelector('[data-testid="chord-num-line"]'))
      .toHaveTextContent('2');
    expect(container.querySelector('[data-testid="chord-num-ray"]'))
      .toHaveTextContent('3');
    expect(container.querySelector('[data-testid="chord-num-vector"]'))
      .toHaveTextContent('4');
  });

  test('chordGroup=null → không hiện hint line', () => {
    const { container } = mount(null);
    expect(container.querySelector('[data-testid="chord-hint"]')).toBeNull();
  });

  test('chordGroup="point" → hiện hint line liệt kê tool trong group', () => {
    const { container } = mount('point');
    const hint = container.querySelector('[data-testid="chord-hint"]');
    expect(hint).not.toBeNull();
    expect(hint).toHaveTextContent(/B/);
    expect(hint).toHaveTextContent(/Điểm mới/);
    expect(hint).toHaveTextContent(/Trung điểm/);
    expect(hint).toHaveTextContent(/Esc/i);
  });

  test('chordGroup="point" → section "Điểm" có data-chord-active="true"', () => {
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
