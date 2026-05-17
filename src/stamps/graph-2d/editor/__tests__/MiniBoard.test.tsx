import { render } from '@testing-library/react';
import { MiniBoard } from '../MiniBoard';
import { EMPTY_GRAPH } from '../../serialize';

jest.mock('jsxgraph', () => {
  const create = jest.fn(() => ({ remove: jest.fn() }));
  const board = {
    create,
    setBoundingBox: jest.fn(),
    update: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    objects: {},
    containerObj: document.createElement('div'),
    removeObject: jest.fn(),
    getBoundingBox: () => [-10, 10, 10, -10],
  };
  return {
    __esModule: true,
    default: {
      JSXGraph: {
        initBoard: jest.fn(() => board),
        freeBoard: jest.fn(),
      },
      Options: { text: {}, label: {} },
    },
  };
});

describe('MiniBoard', () => {
  it('mount với EMPTY_GRAPH không crash', () => {
    const { container } = render(
      <MiniBoard graph={EMPTY_GRAPH} activeTool="move" isDark={false} onBoardEvent={jest.fn()} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('mount với functions không crash', () => {
    const graph = {
      ...EMPTY_GRAPH,
      functions: [
        { id: 'f1', name: 'f', expression: 'x^2', color: '#2563eb', visible: true },
      ],
    };
    const { container } = render(
      <MiniBoard graph={graph} activeTool="move" isDark={false} onBoardEvent={jest.fn()} />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
