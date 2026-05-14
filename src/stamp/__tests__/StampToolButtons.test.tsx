import { render, screen, fireEvent } from '@testing-library/react';
import { StampToolButtons } from '../StampToolButtons';

describe('StampToolButtons', () => {
  test('renders 2 buttons with aria-labels', () => {
    render(<StampToolButtons onGeometryClick={() => {}} onLatexClick={() => {}} />);
    expect(screen.getByRole('button', { name: /chèn hình học/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chèn công thức/i })).toBeInTheDocument();
  });

  test('clicking geometry button calls onGeometryClick', () => {
    const fn = jest.fn();
    render(<StampToolButtons onGeometryClick={fn} onLatexClick={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /chèn hình học/i }));
    expect(fn).toHaveBeenCalled();
  });

  test('clicking latex button calls onLatexClick', () => {
    const fn = jest.fn();
    render(<StampToolButtons onGeometryClick={() => {}} onLatexClick={fn} />);
    fireEvent.click(screen.getByRole('button', { name: /chèn công thức/i }));
    expect(fn).toHaveBeenCalled();
  });

  test('disabled=true makes both buttons disabled', () => {
    render(<StampToolButtons onGeometryClick={() => {}} onLatexClick={() => {}} disabled />);
    expect(screen.getByRole('button', { name: /chèn hình học/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /chèn công thức/i })).toBeDisabled();
  });
});
