import { render, fireEvent } from '@testing-library/react';
import { useStampShortcuts } from '../useStampShortcuts';

function Harness({
  onToggle,
  enabled = true,
}: {
  onToggle: (kind: string) => void;
  enabled?: boolean;
}) {
  useStampShortcuts({ onToggle, enabled });
  return <div data-testid="harness" />;
}

describe('useStampShortcuts (registry-driven)', () => {
  test('pressing G dispatches kind="geometry"', () => {
    const onToggle = jest.fn();
    render(<Harness onToggle={onToggle} />);
    fireEvent.keyDown(window, { key: 'g' });
    expect(onToggle).toHaveBeenCalledWith('geometry');
  });

  test('pressing L dispatches kind="latex"', () => {
    const onToggle = jest.fn();
    render(<Harness onToggle={onToggle} />);
    fireEvent.keyDown(window, { key: 'l' });
    expect(onToggle).toHaveBeenCalledWith('latex');
  });

  test('không fire khi target là input', () => {
    const onToggle = jest.fn();
    const { container } = render(
      <>
        <Harness onToggle={onToggle} />
        <input data-testid="input" />
      </>,
    );
    const input = container.querySelector('[data-testid="input"]') as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 'g', bubbles: true });
    expect(onToggle).not.toHaveBeenCalled();
  });

  test('enabled=false vô hiệu hoá shortcut', () => {
    const onToggle = jest.fn();
    render(<Harness onToggle={onToggle} enabled={false} />);
    fireEvent.keyDown(window, { key: 'g' });
    expect(onToggle).not.toHaveBeenCalled();
  });

  test('bỏ qua khi có modifier (Cmd+G)', () => {
    const onToggle = jest.fn();
    render(<Harness onToggle={onToggle} />);
    fireEvent.keyDown(window, { key: 'g', metaKey: true });
    expect(onToggle).not.toHaveBeenCalled();
  });

  test('bỏ qua phím không có trong registry', () => {
    const onToggle = jest.fn();
    render(<Harness onToggle={onToggle} />);
    fireEvent.keyDown(window, { key: 'x' });
    expect(onToggle).not.toHaveBeenCalled();
  });

  test('registry custom: nhận key chưa có trong default', () => {
    const onToggle = jest.fn();
    const customStamps = [
      {
        kind: 'chart',
        shortcutKey: 'c',
        toolbarLabel: 'C',
        toolbarTitle: 'Chart',
        toolbarIcon: null,
        matchesCustomData: () => false,
        renderSvgFromCustomData: async () => '',
      },
    ];
    function CustomHarness() {
      useStampShortcuts({ enabled: true, onToggle, stamps: customStamps });
      return null;
    }
    render(<CustomHarness />);
    fireEvent.keyDown(window, { key: 'c' });
    expect(onToggle).toHaveBeenCalledWith('chart');
  });
});
