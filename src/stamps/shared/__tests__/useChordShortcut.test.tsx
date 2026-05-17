import { render, fireEvent } from '@testing-library/react';
import { useChordShortcut } from '../useChordShortcut';

type G = 'alpha' | 'beta' | 'gamma';

const GROUP_ORDER: G[] = ['alpha', 'beta', 'gamma'];

const TOOLS: Array<{ key: string; group: G }> = [
  { key: 'a1', group: 'alpha' },
  { key: 'a2', group: 'alpha' },
  { key: 'b1', group: 'beta' },
  { key: 'b2', group: 'beta' },
  { key: 'b3', group: 'beta' },
  { key: 'g1', group: 'gamma' },
];

function Harness({
  onSelect,
  enabled = true,
}: {
  onSelect: (key: string) => void;
  enabled?: boolean;
}) {
  const { chordGroup } = useChordShortcut<G>({
    groupOrder: GROUP_ORDER,
    tools: TOOLS,
    onSelect,
    enabled,
  });
  return <div data-testid="chord">{chordGroup ?? 'null'}</div>;
}

function read(container: HTMLElement): string {
  return container.querySelector('[data-testid="chord"]')!.textContent || '';
}

describe('useChordShortcut', () => {
  test('bấm letter → chordGroup set đúng group, chưa gọi onSelect', () => {
    const onSelect = jest.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: 'b' });
    expect(read(container)).toBe('beta');
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('letter (uppercase) cũng nhận', () => {
    const onSelect = jest.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: 'B', shiftKey: true });
    expect(read(container)).toBe('beta');
  });

  test('letter rồi number hợp lệ → onSelect đúng tool, chord về null', () => {
    const onSelect = jest.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: 'b' });
    fireEvent.keyDown(window, { key: '2' });
    expect(onSelect).toHaveBeenCalledWith('b2');
    expect(read(container)).toBe('null');
  });

  test('letter rồi number vượt index → no-op, chord về null', () => {
    const onSelect = jest.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: 'b' });
    fireEvent.keyDown(window, { key: '9' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(read(container)).toBe('null');
  });

  test('letter rồi Esc → không onSelect, chord về null', () => {
    const onSelect = jest.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: 'a' });
    expect(read(container)).toBe('alpha');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(read(container)).toBe('null');
  });

  test('letter khi chord đang active → chuyển sang group mới', () => {
    const onSelect = jest.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: 'a' });
    expect(read(container)).toBe('alpha');
    fireEvent.keyDown(window, { key: 'c' });
    expect(read(container)).toBe('gamma');
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('number khi chord chưa active → ignore', () => {
    const onSelect = jest.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: '1' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(read(container)).toBe('null');
  });

  test('letter ngoài range A..N (GROUP_ORDER.length) → ignore', () => {
    const onSelect = jest.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: 'z' });
    expect(read(container)).toBe('null');
    // d nằm ngoài 3 group {a,b,c}
    fireEvent.keyDown(window, { key: 'd' });
    expect(read(container)).toBe('null');
  });

  test('modifier (Cmd) → ignore', () => {
    const onSelect = jest.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: 'b', metaKey: true });
    expect(read(container)).toBe('null');
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(read(container)).toBe('null');
    fireEvent.keyDown(window, { key: 'b', altKey: true });
    expect(read(container)).toBe('null');
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('focus input → ignore (không vào chord, không select)', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <>
        <Harness onSelect={onSelect} />
        <input data-testid="in" />
      </>,
    );
    const input = container.querySelector('[data-testid="in"]') as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 'b', bubbles: true });
    fireEvent.keyDown(input, { key: '1', bubbles: true });
    expect(onSelect).not.toHaveBeenCalled();
    expect(read(container)).toBe('null');
  });

  test('enabled=false → listener không hoạt động', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <Harness onSelect={onSelect} enabled={false} />,
    );
    fireEvent.keyDown(window, { key: 'b' });
    fireEvent.keyDown(window, { key: '1' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(read(container)).toBe('null');
  });

  test('Esc khi chord null → không consume (cho handler khác xử lý)', () => {
    const onSelect = jest.fn();
    const escSpy = jest.fn();
    function Wrap() {
      return (
        <>
          <Harness onSelect={onSelect} />
        </>
      );
    }
    render(<Wrap />);
    // Gắn listener riêng để verify hook không stopPropagation khi không có chord
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') escSpy();
    };
    window.addEventListener('keydown', handler);
    fireEvent.keyDown(window, { key: 'Escape' });
    window.removeEventListener('keydown', handler);
    expect(escSpy).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('unmount → gỡ listener', () => {
    const onSelect = jest.fn();
    const { container, unmount } = render(<Harness onSelect={onSelect} />);
    fireEvent.keyDown(window, { key: 'b' });
    expect(read(container)).toBe('beta');
    unmount();
    fireEvent.keyDown(window, { key: 'a' });
    // sau unmount, không còn render — nhưng quan trọng là onSelect không bị fire
    fireEvent.keyDown(window, { key: '1' });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
