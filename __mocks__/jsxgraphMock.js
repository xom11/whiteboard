module.exports = {
  __esModule: true,
  default: {
    Options: { text: { display: 'html' } },
    JSXGraph: {
      initBoard: jest.fn(() => ({
        create: jest.fn((kind) => {
          if (kind === 'view3d') {
            return {
              create: jest.fn(() => ({ id: 'mock-obj' })),
              defaultAxes: [],
            };
          }
          return { id: 'mock-obj' };
        }),
      })),
      freeBoard: jest.fn(),
    },
  },
};
