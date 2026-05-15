import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransformParamPopover } from '../TransformParamPopover';

describe('TransformParamPopover', () => {
  const baseProps = { anchor: { x: 100, y: 100 }, onConfirm: jest.fn(), onCancel: jest.fn(), isDark: false };
  beforeEach(() => jest.clearAllMocks());

  it('rotate: default 90°, label đúng', () => {
    render(<TransformParamPopover {...baseProps} kind="rotate" defaultValue={90} />);
    expect(screen.getByText(/G[oó]c/i)).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(90);
  });

  it('dilate: label tỷ số k', () => {
    render(<TransformParamPopover {...baseProps} kind="dilate" defaultValue={2} />);
    expect(screen.getByText(/k/i)).toBeInTheDocument();
  });

  it('Enter gọi onConfirm với value hiện tại', () => {
    const onConfirm = jest.fn();
    render(<TransformParamPopover {...baseProps} kind="rotate" defaultValue={90} onConfirm={onConfirm} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledWith(45);
  });

  it('Esc gọi onCancel', () => {
    const onCancel = jest.fn();
    render(<TransformParamPopover {...baseProps} kind="rotate" defaultValue={90} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('isDark thêm class theme--dark', () => {
    const { container } = render(<TransformParamPopover {...baseProps} kind="rotate" defaultValue={90} isDark />);
    expect(container.querySelector('.theme--dark')).not.toBeNull();
  });
});
