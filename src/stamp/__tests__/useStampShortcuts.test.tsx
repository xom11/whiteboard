import { render, fireEvent } from '@testing-library/react';
import { useStampShortcuts } from '../useStampShortcuts';

function Harness({ onGeo, onLatex, enabled = true }: { onGeo: () => void; onLatex: () => void; enabled?: boolean }) {
  useStampShortcuts({ onGeometry: onGeo, onLatex, enabled });
  return <div data-testid="harness" />;
}

describe('useStampShortcuts', () => {
  test('pressing G calls onGeometry', () => {
    const onGeo = jest.fn();
    render(<Harness onGeo={onGeo} onLatex={() => {}} />);
    fireEvent.keyDown(window, { key: 'g' });
    expect(onGeo).toHaveBeenCalled();
  });

  test('pressing L calls onLatex', () => {
    const onLatex = jest.fn();
    render(<Harness onGeo={() => {}} onLatex={onLatex} />);
    fireEvent.keyDown(window, { key: 'l' });
    expect(onLatex).toHaveBeenCalled();
  });

  test('does not fire when focus is in input element', () => {
    const onGeo = jest.fn();
    const { container } = render(
      <>
        <Harness onGeo={onGeo} onLatex={() => {}} />
        <input data-testid="input" />
      </>
    );
    const input = container.querySelector('[data-testid="input"]') as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 'g', bubbles: true });
    expect(onGeo).not.toHaveBeenCalled();
  });

  test('enabled=false disables shortcuts', () => {
    const onGeo = jest.fn();
    render(<Harness onGeo={onGeo} onLatex={() => {}} enabled={false} />);
    fireEvent.keyDown(window, { key: 'g' });
    expect(onGeo).not.toHaveBeenCalled();
  });

  test('ignores G with modifier (Cmd+G)', () => {
    const onGeo = jest.fn();
    render(<Harness onGeo={onGeo} onLatex={() => {}} />);
    fireEvent.keyDown(window, { key: 'g', metaKey: true });
    expect(onGeo).not.toHaveBeenCalled();
  });
});
