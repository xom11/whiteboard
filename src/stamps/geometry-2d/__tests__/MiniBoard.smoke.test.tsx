import { render } from '@testing-library/react';
import { MiniBoard2D } from '../editor/MiniBoard';

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
  const { container } = render(<MiniBoard2D initialState={null} />);
  expect(container.querySelector('[data-testid="jxgmini-container"]')).toBeTruthy();
});
