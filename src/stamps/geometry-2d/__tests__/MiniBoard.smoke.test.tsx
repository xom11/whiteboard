import { render } from '@testing-library/react';
import { MiniBoard2D } from '../editor/MiniBoard';
import { createStore, createEmptyState } from '../../../core/scene';

jest.mock('jsxgraph', () => ({
  __esModule: true,
  default: {
    JSXGraph: {
      initBoard: jest.fn(() => ({
        on: jest.fn(),
        off: jest.fn(),
        getBoundingBox: () => [-10, 10, 10, -10],
        getUsrCoordsOfMouse: () => [0, 0],
        create: jest.fn(),
        removeObject: jest.fn(),
      })),
      freeBoard: jest.fn(),
    },
  },
}));

test('MiniBoard2D mounts and renders container', () => {
  const store = createStore(createEmptyState('2d'));
  const { container } = render(<MiniBoard2D store={store} initialState={null} />);
  expect(container.querySelector('[data-testid="jxgmini-container"]')).toBeTruthy();
});
