import { render, screen, fireEvent } from '@testing-library/react';
import { FunctionRow } from '../FunctionRow';

describe('FunctionRow', () => {
  const defaultProps = {
    id: 'f1',
    name: 'f',
    expression: 'x^2',
    color: '#2563eb',
    visible: true,
    error: null,
    onExpressionCommit: jest.fn(),
    onToggleVisible: jest.fn(),
    onRemove: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('hiển thị tên, biểu thức và màu', () => {
    render(<FunctionRow {...defaultProps} />);
    expect(screen.getByLabelText(/biểu thức/i)).toHaveValue('x^2');
    expect(screen.getByTestId('graph-function-name-f1')).toHaveTextContent('f');
  });

  it('Enter trên input fire onExpressionCommit', () => {
    render(<FunctionRow {...defaultProps} />);
    const input = screen.getByLabelText(/biểu thức/i);
    fireEvent.change(input, { target: { value: 'sin(x)' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(defaultProps.onExpressionCommit).toHaveBeenCalledWith('sin(x)');
  });

  it('Blur fire onExpressionCommit nếu giá trị đổi', () => {
    render(<FunctionRow {...defaultProps} />);
    const input = screen.getByLabelText(/biểu thức/i);
    fireEvent.change(input, { target: { value: 'sin(x)' } });
    fireEvent.blur(input);
    expect(defaultProps.onExpressionCommit).toHaveBeenCalledWith('sin(x)');
  });

  it('Click eye fire onToggleVisible', () => {
    render(<FunctionRow {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(/ẩn\/hiện/i));
    expect(defaultProps.onToggleVisible).toHaveBeenCalled();
  });

  it('hiển thị error UI khi prop error truthy', () => {
    render(<FunctionRow {...defaultProps} error="Lỗi cú pháp" />);
    expect(screen.getByText('Lỗi cú pháp')).toBeInTheDocument();
  });

  it('Click remove fire onRemove', () => {
    render(<FunctionRow {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(/xoá/i));
    expect(defaultProps.onRemove).toHaveBeenCalled();
  });
});
