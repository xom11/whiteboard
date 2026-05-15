import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPopover } from '../PropertiesPopover';

describe('PropertiesPopover', () => {
  const baseProps = { anchor: { x: 50, y: 50 }, onClose: jest.fn(), onMutate: jest.fn(), isDark: false };
  beforeEach(() => jest.clearAllMocks());

  it('point: hiện palette + input tên + style point + nút xoá', () => {
    render(<PropertiesPopover {...baseProps} kind="point" currentName="A" currentColor="#1e1e1e" currentDash={0} currentWidth={2} currentFace="o" />);
    expect(screen.getAllByRole('button', { name: /M[aà]u/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('textbox')).toHaveValue('A');
    expect(screen.getByRole('button', { name: /Xo[aá]/i })).toBeInTheDocument();
  });

  it('click swatch → onMutate với strokeColor', () => {
    const onMutate = jest.fn();
    render(<PropertiesPopover {...baseProps} kind="point" currentName="A" currentColor="#1e1e1e" currentDash={0} currentWidth={2} currentFace="o" onMutate={onMutate} />);
    fireEvent.click(screen.getByRole('button', { name: /M[aà]u #e03131/i }));
    expect(onMutate).toHaveBeenCalledWith({ attrs: expect.objectContaining({ strokeColor: '#e03131' }) });
  });

  it('đổi tên → onMutate với name', () => {
    const onMutate = jest.fn();
    render(<PropertiesPopover {...baseProps} kind="point" currentName="A" currentColor="#1e1e1e" currentDash={0} currentWidth={2} currentFace="o" onMutate={onMutate} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'B' } });
    fireEvent.blur(screen.getByRole('textbox'));
    expect(onMutate).toHaveBeenCalledWith({ attrs: { name: 'B' } });
  });

  it('click Xoá → onMutate({ remove: true }) + onClose', () => {
    const onMutate = jest.fn();
    const onClose = jest.fn();
    render(<PropertiesPopover {...baseProps} kind="point" currentName="A" currentColor="#1e1e1e" currentDash={0} currentWidth={2} currentFace="o" onMutate={onMutate} onClose={onClose} />);
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

  it('line: không có input tên, có style dash', () => {
    render(<PropertiesPopover {...baseProps} kind="line" currentColor="#1e1e1e" currentDash={0} currentWidth={2} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: /Ki[eể]u n[eé]t đứt/i })).toBeInTheDocument();
  });
});
