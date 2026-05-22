import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Toast } from '../Toast';

describe('Toast item', () => {
  test('renders message + warning border class', () => {
    const { container, getByText } = render(
      <Toast id="1" message="hello" variant="warning" onDismiss={() => {}} />,
    );
    expect(getByText('hello')).toBeTruthy();
    expect((container.firstChild as HTMLElement).className).toContain('border-l-amber-500');
  });

  test('clicking close button calls onDismiss with id', () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = render(
      <Toast id="abc" message="x" variant="info" onDismiss={onDismiss} />,
    );
    fireEvent.click(getByLabelText('Đóng thông báo'));
    expect(onDismiss).toHaveBeenCalledWith('abc');
  });

  test('error variant uses rose border', () => {
    const { container } = render(
      <Toast id="1" message="oops" variant="error" onDismiss={() => {}} />,
    );
    expect((container.firstChild as HTMLElement).className).toContain('border-l-rose-500');
  });

  test('info variant uses sky border', () => {
    const { container } = render(
      <Toast id="1" message="info" variant="info" onDismiss={() => {}} />,
    );
    expect((container.firstChild as HTMLElement).className).toContain('border-l-sky-500');
  });
});
