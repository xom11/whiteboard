import * as React from 'react';
import { render } from '@testing-library/react';
import { MiniBoard3D, type MiniBoard3DHandle } from '../editor/MiniBoard3D';

// JSXGraph stub — its real initBoard does not run cleanly in jsdom. The
// MiniBoard3D init effect wraps these calls in try/catch so missing methods
// here are tolerated; we still provide a basic mock to silence import errors.
jest.mock('jsxgraph', () => ({
  __esModule: true,
  default: {
    Options: { text: { display: 'html' } },
    JSXGraph: {
      initBoard: jest.fn(() => ({
        create: jest.fn(() => ({ id: 'mock-view' })),
        on: jest.fn(),
        off: jest.fn(),
        renderer: { container: document.createElement('div') },
      })),
      freeBoard: jest.fn(),
    },
  },
}));

describe('MiniBoard3D', () => {
  test('renders container div', () => {
    const { getByTestId } = render(<MiniBoard3D isDark={false} />);
    expect(getByTestId('mini-board-3d')).toBeInTheDocument();
  });

  test('exposes imperative handle', () => {
    const ref = React.createRef<MiniBoard3DHandle>();
    render(<MiniBoard3D ref={ref} isDark={false} />);
    expect(ref.current).toBeTruthy();
    expect(typeof ref.current?.getBoard).toBe('function');
    expect(typeof ref.current?.getView3D).toBe('function');
    expect(typeof ref.current?.getSvgElement).toBe('function');
  });
});
