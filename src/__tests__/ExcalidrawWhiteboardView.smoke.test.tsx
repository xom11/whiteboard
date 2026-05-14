import React from 'react';
import { render } from '@testing-library/react';
import { ExcalidrawWhiteboardView } from '../ExcalidrawWhiteboardView';

// Mock Excalidraw — quá heavy cho jsdom (esm.sh fonts, canvas).
// Mock relays `renderTopRightUI` prop để stamp UI test pass.
jest.mock('@excalidraw/excalidraw', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Excalidraw: (props: {
      excalidrawAPI?: (api: unknown) => void;
      renderTopRightUI?: (isMobile: boolean, appState: unknown) => React.ReactNode;
    }) => {
      React.useEffect(() => {
        props.excalidrawAPI?.({
          updateScene: jest.fn(),
          addFiles: jest.fn(),
          getSceneElements: () => [],
          getFiles: () => ({}),
          getAppState: () => ({ zoom: { value: 1 }, scrollX: 0, scrollY: 0, width: 800, height: 600 }),
        });
      }, []);
      return React.createElement(
        'div',
        { 'data-testid': 'excalidraw-mock' },
        typeof props.renderTopRightUI === 'function' ? props.renderTopRightUI(false, {}) : null,
      );
    },
    hashElementsVersion: () => 'hash',
  };
});

// Mock stamp/renderLatexToSvg to avoid katex ESM import in jsdom.
jest.mock('../stamp/renderLatexToSvg', () => ({
  renderLatexToSvg: jest.fn(async () => '<svg>mock</svg>'),
}));

// Next dynamic import: resolve loader synchronously.
jest.mock('next/dynamic', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function dynamicMock(loader: () => Promise<any>) {
    const Comp = (props: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [Resolved, setResolved]: [any, (v: any) => void] = React.useState(null);
      React.useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void loader().then((mod: any) => {
          const Ctor = typeof mod === 'function' ? mod : mod.default;
          setResolved(() => Ctor);
        });
      }, []);
      if (!Resolved) return null;
      return React.createElement(Resolved, props);
    };
    return Comp;
  };
});

describe('ExcalidrawWhiteboardView', () => {
  test('renders for teacher role without crashing', async () => {
    const { findByTestId } = render(
      React.createElement(ExcalidrawWhiteboardView, {
        role: 'teacher',
        roomId: 'r1',
        initialScene: null,
        remoteScene: null,
        onSceneChange: () => {},
        onFilesChange: () => {},
      }),
    );
    expect(await findByTestId('excalidraw-mock')).toBeInTheDocument();
  });
});

describe('ExcalidrawWhiteboardView stamp UI', () => {
  test('teacher: renders stamp buttons via renderTopRightUI slot', async () => {
    const { findByLabelText } = render(
      React.createElement(ExcalidrawWhiteboardView, {
        role: 'teacher',
        roomId: 't1',
        initialScene: null,
        remoteScene: null,
        onSceneChange: () => {},
        onFilesChange: () => {},
      }),
    );
    expect(await findByLabelText(/chèn hình học/i)).toBeInTheDocument();
    expect(await findByLabelText(/chèn công thức/i)).toBeInTheDocument();
  });

  test('student: stamp buttons disabled', async () => {
    const { findByLabelText } = render(
      React.createElement(ExcalidrawWhiteboardView, {
        role: 'student',
        roomId: 't1',
        initialScene: null,
        remoteScene: null,
        onSceneChange: () => {},
        onFilesChange: () => {},
      }),
    );
    const geoBtn = await findByLabelText(/chèn hình học/i);
    expect(geoBtn).toBeDisabled();
  });
});
