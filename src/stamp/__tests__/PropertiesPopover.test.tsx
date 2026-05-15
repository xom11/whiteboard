import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPopover } from '../PropertiesPopover';

describe('PropertiesPopover', () => {
  const baseProps = { anchor: { x: 50, y: 50 }, onClose: jest.fn(), onMutate: jest.fn(), isDark: false };
  beforeEach(() => jest.clearAllMocks());

  const renderPoint = (over: Partial<Parameters<typeof PropertiesPopover>[0]> = {}) =>
    render(
      <PropertiesPopover
        {...baseProps}
        kind="point"
        currentName="A"
        currentColor="#1e1e1e"
        currentDash={0}
        currentWidth={2}
        currentFace="o"
        {...over}
      />,
    );

  it('point: pill có 5 nút (color/style/size/name/trash)', () => {
    renderPoint();
    expect(screen.getByRole('button', { name: /^M[aà]u$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Ki[eể]u$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Độ d[aà]y$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^T[eê]n$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xo[aá]/i })).toBeInTheDocument();
  });

  it('click pill "Màu" → mở palette; click swatch → onMutate với strokeColor', () => {
    const onMutate = jest.fn();
    renderPoint({ onMutate });
    fireEvent.click(screen.getByRole('button', { name: /^M[aà]u$/i }));
    fireEvent.click(screen.getByRole('button', { name: /M[aà]u #e03131/i }));
    expect(onMutate).toHaveBeenCalledWith({ attrs: expect.objectContaining({ strokeColor: '#e03131' }) });
  });

  it('click pill "Tên" → mở input; đổi tên → onMutate với name', () => {
    const onMutate = jest.fn();
    renderPoint({ onMutate });
    fireEvent.click(screen.getByRole('button', { name: /^T[eê]n$/i }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'B' } });
    fireEvent.blur(input);
    expect(onMutate).toHaveBeenCalledWith({ attrs: { name: 'B' } });
  });

  it('đổi tên trùng → tự thêm subscript B → B₂', () => {
    const onMutate = jest.fn();
    renderPoint({ onMutate, currentName: 'A', getAllNames: () => ['A', 'B'] });
    fireEvent.click(screen.getByRole('button', { name: /^T[eê]n$/i }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'B' } });
    fireEvent.blur(input);
    expect(onMutate).toHaveBeenCalledWith({ attrs: { name: 'B₂' } });
  });

  it('click Xoá (trash) → onMutate({ remove: true }) + onClose', () => {
    const onMutate = jest.fn();
    const onClose = jest.fn();
    renderPoint({ onMutate, onClose });
    fireEvent.click(screen.getByRole('button', { name: /Xo[aá]/i }));
    expect(onMutate).toHaveBeenCalledWith({ remove: true });
    expect(onClose).toHaveBeenCalled();
  });

  it('Esc đóng', () => {
    const onClose = jest.fn();
    render(<PropertiesPopover {...baseProps} kind="line" currentColor="#1e1e1e" currentDash={0} currentWidth={2} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('line: có nút Tên, mở section style hiện dash', () => {
    render(<PropertiesPopover {...baseProps} kind="line" currentName="" currentColor="#1e1e1e" currentDash={0} currentWidth={2} />);
    expect(screen.getByRole('button', { name: /^T[eê]n$/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Ki[eể]u$/i }));
    expect(screen.getByRole('button', { name: /Ki[eể]u n[eé]t đứt/i })).toBeInTheDocument();
  });

  it('line: đặt tên qua input + onMutate name', () => {
    const onMutate = jest.fn();
    render(<PropertiesPopover {...baseProps} kind="line" currentName="" currentColor="#1e1e1e" currentDash={0} currentWidth={2} onMutate={onMutate} />);
    fireEvent.click(screen.getByRole('button', { name: /^T[eê]n$/i }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'f' } });
    fireEvent.blur(input);
    expect(onMutate).toHaveBeenCalledWith({ attrs: { name: 'f' } });
  });

  it('line: toggle "Hiển thị giá trị" gọi onMutate({ valueLabel: true })', () => {
    const onMutate = jest.fn();
    render(<PropertiesPopover {...baseProps} kind="line" currentName="f" currentColor="#1e1e1e" currentDash={0} currentWidth={2} currentShowValue={false} onMutate={onMutate} />);
    fireEvent.click(screen.getByRole('button', { name: /^T[eê]n$/i }));
    const cb = screen.getByRole('checkbox', { name: /Hi[eể]n th[ịi] gi[aá] tr[ịi]/i });
    fireEvent.click(cb);
    expect(onMutate).toHaveBeenCalledWith({ valueLabel: true });
  });

  it('line: toggle "Hiển thị tên" gọi onMutate({ attrs: { withLabel: false } })', () => {
    const onMutate = jest.fn();
    render(<PropertiesPopover {...baseProps} kind="line" currentName="f" currentColor="#1e1e1e" currentDash={0} currentWidth={2} currentShowLabel={true} onMutate={onMutate} />);
    fireEvent.click(screen.getByRole('button', { name: /^T[eê]n$/i }));
    const cb = screen.getByRole('checkbox', { name: /Hi[eể]n th[ịi] t[eê]n/i });
    fireEvent.click(cb);
    expect(onMutate).toHaveBeenCalledWith({ attrs: { withLabel: false } });
  });
});
