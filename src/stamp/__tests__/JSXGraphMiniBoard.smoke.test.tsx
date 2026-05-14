import { render } from '@testing-library/react';
import { JSXGraphMiniBoard } from '../JSXGraphMiniBoard';

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

test('JSXGraphMiniBoard mounts and renders container', () => {
  const { container } = render(<JSXGraphMiniBoard onReady={() => {}} initialState={null} />);
  expect(container.querySelector('[data-testid="jxgmini-container"]')).toBeTruthy();
});

test('renders 6 tool buttons', () => {
  const { getByRole } = render(<JSXGraphMiniBoard onReady={() => {}} initialState={null} />);
  ['Chọn', 'Điểm', 'Đoạn', 'Đường thẳng', 'Đường tròn', 'Xoá đối tượng'].forEach(label => {
    expect(getByRole('button', { name: label })).toBeTruthy();
  });
});
