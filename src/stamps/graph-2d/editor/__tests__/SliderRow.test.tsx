import { render, screen, fireEvent } from '@testing-library/react';
import { SliderRow } from '../SliderRow';

describe('SliderRow', () => {
  const props = {
    name: 'a',
    value: 1,
    min: -5,
    max: 5,
    step: 0.1,
    onChange: jest.fn(),
    onRemove: jest.fn(),
    onRangeChange: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('hiển thị tên và giá trị', () => {
    render(<SliderRow {...props} />);
    expect(screen.getByText(/^a$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/slider a/i)).toHaveValue('1');
  });

  it('Drag slider fire onChange với số mới', () => {
    render(<SliderRow {...props} />);
    fireEvent.change(screen.getByLabelText(/slider a/i), { target: { value: '2.5' } });
    expect(props.onChange).toHaveBeenCalledWith(2.5);
  });

  it('range input đúng min/max/step', () => {
    render(<SliderRow {...props} />);
    const slider = screen.getByLabelText(/slider a/i);
    expect(slider).toHaveAttribute('min', '-5');
    expect(slider).toHaveAttribute('max', '5');
    expect(slider).toHaveAttribute('step', '0.1');
  });

  it('Click remove fire onRemove', () => {
    render(<SliderRow {...props} />);
    fireEvent.click(screen.getByLabelText(/xoá tham số a/i));
    expect(props.onRemove).toHaveBeenCalled();
  });
});
