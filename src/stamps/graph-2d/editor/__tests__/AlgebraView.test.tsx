import { render, screen, fireEvent } from '@testing-library/react';
import { AlgebraView } from '../AlgebraView';
import { EMPTY_GRAPH } from '../../serialize';

describe('AlgebraView', () => {
  const baseHandlers = {
    onAddFunctionDraft: jest.fn(),
    onCommitFunctionExpr: jest.fn(),
    onToggleFunctionVisible: jest.fn(),
    onRemoveFunction: jest.fn(),
    onParameterChange: jest.fn(),
    onParameterRangeChange: jest.fn(),
    onRemoveParameter: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('render rỗng cho EMPTY_GRAPH có nút thêm hàm', () => {
    render(<AlgebraView graph={EMPTY_GRAPH} errors={{}} {...baseHandlers} />);
    expect(screen.getByLabelText(/thêm hàm/i)).toBeInTheDocument();
  });

  it('render mỗi function thành 1 row', () => {
    const graph = {
      ...EMPTY_GRAPH,
      functions: [
        { id: 'f1', name: 'f', expression: 'x^2', color: '#2563eb', visible: true },
        { id: 'f2', name: 'g', expression: 'sin(x)', color: '#dc2626', visible: true },
      ],
    };
    render(<AlgebraView graph={graph} errors={{}} {...baseHandlers} />);
    expect(screen.getByTestId('graph-function-row-f1')).toBeInTheDocument();
    expect(screen.getByTestId('graph-function-row-f2')).toBeInTheDocument();
  });

  it('render mỗi parameter thành 1 slider row', () => {
    const graph = {
      ...EMPTY_GRAPH,
      parameters: [
        { name: 'a', value: 1, min: -5, max: 5, step: 0.1 },
      ],
    };
    render(<AlgebraView graph={graph} errors={{}} {...baseHandlers} />);
    expect(screen.getByTestId('graph-slider-row-a')).toBeInTheDocument();
  });

  it('Click "thêm hàm" fire onAddFunctionDraft', () => {
    render(<AlgebraView graph={EMPTY_GRAPH} errors={{}} {...baseHandlers} />);
    fireEvent.click(screen.getByLabelText(/thêm hàm/i));
    expect(baseHandlers.onAddFunctionDraft).toHaveBeenCalled();
  });

  it('Disable nút thêm khi đạt MAX_FUNCTIONS', () => {
    const funcs = Array.from({ length: 8 }, (_, i) => ({
      id: `f${i}`, name: 'f', expression: 'x', color: '#000', visible: true,
    }));
    render(<AlgebraView graph={{ ...EMPTY_GRAPH, functions: funcs }} errors={{}} {...baseHandlers} />);
    expect(screen.getByLabelText(/thêm hàm/i)).toBeDisabled();
  });
});
