import * as React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ObjectRowMenu } from '../ObjectRowMenu';

describe('ObjectRowMenu', () => {
  function setup(props: Partial<React.ComponentProps<typeof ObjectRowMenu>> = {}) {
    const onRename = jest.fn();
    const onChangeColor = jest.fn();
    const onDelete = jest.fn();
    const utils = render(
      <ObjectRowMenu
        onRename={onRename}
        onChangeColor={onChangeColor}
        onDelete={onDelete}
        {...props}
      />,
    );
    return { ...utils, onRename, onChangeColor, onDelete };
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
});
