module.exports = {
  __esModule: true,
  default: {
    Options: { text: { display: 'html' } },
    JSXGraph: {
      initBoard: jest.fn((containerId, _opts) => {
        // Inject a minimal SVG into the container so render functions can extract it
        if (typeof document !== 'undefined') {
          const el = document.getElementById(containerId);
          if (el) {
            el.innerHTML =
              '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"></svg>';
          }
        }
        const createdElements = [];
        const board = {
          create: jest.fn((kind, _data, attrs) => {
            // When a functiongraph is created with a visible color, record it in SVG
            if (kind === 'functiongraph' && attrs && attrs.strokeColor) {
              if (typeof document !== 'undefined') {
                const el = document.getElementById(containerId);
                const svg = el && el.querySelector('svg');
                if (svg) {
                  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                  path.setAttribute('stroke', attrs.strokeColor);
                  path.setAttribute('d', 'M0,0 L600,400');
                  svg.appendChild(path);
                }
              }
              createdElements.push({ kind, attrs });
            }
            if (kind === 'view3d') {
              return {
                create: jest.fn(() => ({ id: 'mock-obj' })),
                defaultAxes: [],
              };
            }
            return { id: 'mock-obj' };
          }),
          update: jest.fn(),
        };
        return board;
      }),
      freeBoard: jest.fn(),
    },
  },
};
