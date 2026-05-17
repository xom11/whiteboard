import { render } from '@testing-library/react';
import { GeometryLeftPanel } from '../editor/LeftPanel';

function mount(chordGroup: 'move' | 'point' | 'line' | null) {
  return render(
    <GeometryLeftPanel
      activeTool="move"
      onToolChange={() => {}}
      showAxis={false}
      showGrid={false}
      onShowAxisChange={() => {}}
      onShowGridChange={() => {}}
      onUndo={() => {}}
      canUndo={false}
      onClose={() => {}}
      isMobile={false}
      chordGroup={chordGroup}
    />,
  );
}

describe('GeometryLeftPanel — chord UI', () => {
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
    const activeSection = container.querySelector(
      '[data-chord-group="point"]',
    );
    expect(activeSection?.getAttribute('data-chord-active')).toBe('true');
    const otherSection = container.querySelector(
      '[data-chord-group="move"]',
    );
    expect(otherSection?.getAttribute('data-chord-active')).toBe('false');
  });
});
