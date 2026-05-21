import * as React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ObjectRowMenu } from '../ObjectRowMenu';

describe('ObjectRowMenu', () => {
  function setup(props: Partial<React.ComponentProps<typeof ObjectRowMenu>> = {}) {
    const onToggleLocked = jest.fn();
    const onRename = jest.fn();
    const onChangeColor = jest.fn();
    const onDelete = jest.fn();
    const utils = render(
      <ObjectRowMenu
        locked={false}
        onToggleLocked={onToggleLocked}
        onRename={onRename}
        onChangeColor={onChangeColor}
        onDelete={onDelete}
        {...props}
      />,
    );
    return { ...utils, onToggleLocked, onRename, onChangeColor, onDelete };
  }

  it('hidden menu by default', () => {
    setup();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens menu on button click', () => {
    setup();
    fireEvent.click(screen.getByLabelText('Row menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows Khoá when unlocked', () => {
    setup({ locked: false });
    fireEvent.click(screen.getByLabelText('Row menu'));
    expect(screen.getByText('Khoá')).toBeInTheDocument();
  });

  it('shows Mở khoá when locked', () => {
    setup({ locked: true });
    fireEvent.click(screen.getByLabelText('Row menu'));
    expect(screen.getByText('Mở khoá')).toBeInTheDocument();
  });

  it('calls onToggleLocked and closes menu', () => {
    const { onToggleLocked } = setup();
    fireEvent.click(screen.getByLabelText('Row menu'));
    fireEvent.click(screen.getByText('Khoá'));
    expect(onToggleLocked).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('calls onDelete and closes menu', () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByLabelText('Row menu'));
    fireEvent.click(screen.getByText('Xoá'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('calls onChangeColor', () => {
    const { onChangeColor } = setup();
    fireEvent.click(screen.getByLabelText('Row menu'));
    fireEvent.click(screen.getByText('Đổi màu'));
    expect(onChangeColor).toHaveBeenCalledTimes(1);
  });

  it('menu items have dark-mode text class for contrast', () => {
    setup();
    fireEvent.click(screen.getByLabelText('Row menu'));
    const item = screen.getByText('Khoá');
    expect(item.className).toContain('dark:text-zinc-100');
  });
});
