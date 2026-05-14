import { render, screen, fireEvent, act } from '@testing-library/react';
import { LatexEditorPopover } from '../LatexEditorPopover';

jest.mock('../renderLatexToSvg', () => ({
  renderLatexToSvg: jest.fn(async (src) => {
    if (src.includes('\\invalid')) throw new Error('parse error');
    return '<svg>' + src + '</svg>';
  }),
}));

describe('LatexEditorPopover', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  test('renders input field with initial value', () => {
    render(<LatexEditorPopover x={100} y={100} initialValue="a+b" onInsert={() => {}} onClose={() => {}} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('a+b');
  });

  test('Insert button calls onInsert with (svgString, src, displayMode)', async () => {
    const onInsert = jest.fn();
    render(<LatexEditorPopover x={0} y={0} initialValue="x" onInsert={onInsert} onClose={() => {}} />);
    await act(async () => { jest.advanceTimersByTime(150); });
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: /chèn/i }));
    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining('<svg>'), 'x', false);
  });

  test('Esc key calls onClose', () => {
    const onClose = jest.fn();
    render(<LatexEditorPopover x={0} y={0} initialValue="" onInsert={() => {}} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  test('invalid LaTeX disables Insert button', async () => {
    render(<LatexEditorPopover x={0} y={0} initialValue="\\invalid{" onInsert={() => {}} onClose={() => {}} />);
    await act(async () => { jest.advanceTimersByTime(150); await Promise.resolve(); });
    expect(screen.getByRole('button', { name: /chèn/i })).toBeDisabled();
  });
});
