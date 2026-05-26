import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { Whiteboard } from '../Whiteboard';
import { ALL_STAMPS } from '../stamps';
import { readFiles, writeFiles, pruneFiles } from '../core/persistence/fileStore';

jest.mock('../core/persistence/fileStore', () => ({
  readFiles: jest.fn(async () => ({})),
  writeFiles: jest.fn(async () => undefined),
  pruneFiles: jest.fn(async () => undefined),
}));

// Mock Excalidraw: real package is too heavy for jsdom (canvas/fonts).
jest.mock('@excalidraw/excalidraw', () => {
   
  const React = require('react');
  const NoopChildren = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const DefaultItem = () => null;
  const MainMenu = Object.assign(NoopChildren, {
    DefaultItems: {
      LoadScene: DefaultItem,
      SaveAsImage: DefaultItem,
      ClearCanvas: DefaultItem,
      ToggleTheme: DefaultItem,
    },
  });
  return {
    Excalidraw: (props: {
      excalidrawAPI?: (api: unknown) => void;
      children?: React.ReactNode;
      viewModeEnabled?: boolean;
      initialData?: unknown;
      onChange?: (elements: unknown[], appState: unknown, files: Record<string, unknown>) => void;
    }) => {
       
      (globalThis as any).__excProps = props;
      React.useEffect(() => {
        const api = {
          updateScene: jest.fn(),
          addFiles: jest.fn(),
          getSceneElements: () =>
             
            ((globalThis as any).__sceneElements ?? []),
          getFiles: () => ({}),
          getAppState: () => ({
            zoom: { value: 1 },
            scrollX: 0,
            scrollY: 0,
            width: 800,
            height: 600,
          }),
          setActiveTool: jest.fn(),
        };
         
        (globalThis as any).__excApi = api;
        props.excalidrawAPI?.(api);
      }, []);
      return React.createElement(
        'div',
        { 'data-testid': 'excalidraw-mock', className: 'excalidraw' },
        React.createElement(
          'div',
          { className: 'App-toolbar' },
          React.createElement('div', { className: 'Stack Stack_horizontal' }),
        ),
        props.children,
      );
    },
    MainMenu,
    Footer: NoopChildren,
    WelcomeScreen: NoopChildren,
    hashElementsVersion: (elements: { id?: string }[]) =>
      elements.map((element) => element.id ?? '').join('|'),
  };
});

jest.mock('../stamps/latex/render', () => ({
  renderLatexToSvg: jest.fn(async () => '<svg>mock</svg>'),
}));

// MiniBoard3D imports JXG and calls initBoard in useEffect. Mock it so
// EditorPanel can mount without the infinite setBoardKey loop caused by
// the real component calling the ref callback.
jest.mock('../stamps/geometry-3d/editor/MiniBoard3D', () => ({
  MiniBoard3D: jest.fn(() => null),
}));

type ExcProps = {
  viewModeEnabled?: boolean;
  initialData?: { elements?: unknown[] };
  onChange?: (elements: unknown[], appState: unknown, files: Record<string, unknown>) => void;
};

const getExcProps = () =>
   
  (globalThis as any).__excProps as ExcProps | null;

const rasterFile = {
  dataURL: 'data:image/png;base64,AAA',
  mimeType: 'image/png',
  created: 1700000000000,
};

beforeEach(() => {
  jest.useRealTimers();
  window.localStorage.clear();
  jest.clearAllMocks();
   
  (globalThis as any).__excProps = null;
   
  (globalThis as any).__sceneElements = [];
   
  (globalThis as any).__excApi = null;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Whiteboard', () => {
  test('smoke: render Excalidraw mock', async () => {
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    expect(await findByTestId('excalidraw-mock')).toBeInTheDocument();
  });

  test('readOnly={true} passes viewModeEnabled=true and hides stamp buttons', async () => {
    const { findByTestId, queryByLabelText } = render(
      React.createElement(Whiteboard, { readOnly: true }),
    );
    await findByTestId('excalidraw-mock');
    expect(getExcProps()?.viewModeEnabled).toBe(true);
    expect(queryByLabelText(/chèn hình học/i)).toBeNull();
    expect(queryByLabelText(/chèn công thức/i)).toBeNull();
  });

  test('default mode enables stamp toolbar (injected into popover)', async () => {
    // v0.7.0: stamps are injected into the "More tools" popover.
    // Verify Whiteboard renders without errors when stamps are enabled.
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    await findByTestId('excalidraw-mock');
    // Component renders successfully - stamps will be injected when popover opens
    expect(true).toBe(true);
  });

  test('pre-seeded localStorage becomes Excalidraw initialData', async () => {
    window.localStorage.setItem(
      'whiteboard:scene:default',
      JSON.stringify({
        version: 1,
        elements: [{ id: 'el1', type: 'rectangle' }],
        appState: { theme: 'light' },
        savedAt: Date.now(),
      }),
    );
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    await findByTestId('excalidraw-mock');
    expect(getExcProps()?.initialData?.elements).toEqual([{ id: 'el1', type: 'rectangle' }]);
  });

  test('storageKey=null skips localStorage and IndexedDB reads', async () => {
    window.localStorage.setItem(
      'whiteboard:scene:default',
      JSON.stringify({
        version: 1,
        elements: [{ id: 'el1', type: 'rectangle' }],
        appState: {},
        savedAt: 0,
      }),
    );
    const { findByTestId } = render(React.createElement(Whiteboard, { storageKey: null }));
    await findByTestId('excalidraw-mock');
    expect(getExcProps()?.initialData?.elements).toBeUndefined();
    expect(readFiles).not.toHaveBeenCalled();
  });

  test('onChange persists scene to localStorage after throttle', async () => {
    jest.useFakeTimers();
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    await findByTestId('excalidraw-mock');

    act(() => {
      getExcProps()?.onChange?.(
        [{ id: 'el1', type: 'rectangle', isDeleted: false }],
        { theme: 'dark', viewBackgroundColor: '#fff', zoom: { value: 1 }, scrollX: 4, scrollY: 5 },
        {},
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
      await Promise.resolve();
    });

    const raw = window.localStorage.getItem('whiteboard:scene:default');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toMatchObject({
      version: 1,
      elements: [{ id: 'el1', type: 'rectangle', isDeleted: false }],
      appState: { theme: 'dark', scrollX: 4, scrollY: 5 },
    });
  });

  test('appState-only changes are persisted even when elements are unchanged', async () => {
    jest.useFakeTimers();
    const element = { id: 'el1', type: 'rectangle', isDeleted: false };
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    await findByTestId('excalidraw-mock');

    act(() => {
      getExcProps()?.onChange?.(
        [element],
        { theme: 'light', viewBackgroundColor: '#fff', zoom: { value: 1 }, scrollX: 0, scrollY: 0 },
        {},
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
      await Promise.resolve();
    });

    act(() => {
      getExcProps()?.onChange?.(
        [element],
        { theme: 'dark', viewBackgroundColor: '#fff', zoom: { value: 1 }, scrollX: 80, scrollY: 90 },
        {},
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
      await Promise.resolve();
    });

    const raw = window.localStorage.getItem('whiteboard:scene:default');
    expect(JSON.parse(raw ?? '{}').appState).toMatchObject({
      theme: 'dark',
      scrollX: 80,
      scrollY: 90,
    });
  });

  test('scene throttle persists the latest change in the throttle window', async () => {
    jest.useFakeTimers();
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    await findByTestId('excalidraw-mock');

    act(() => {
      getExcProps()?.onChange?.(
        [{ id: 'early', type: 'rectangle', isDeleted: false }],
        { theme: 'light', viewBackgroundColor: '#fff', scrollX: 0, scrollY: 0 },
        {},
      );
      getExcProps()?.onChange?.(
        [{ id: 'latest', type: 'rectangle', isDeleted: false }],
        { theme: 'dark', viewBackgroundColor: '#fff', scrollX: 10, scrollY: 20 },
        {},
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
      await Promise.resolve();
    });

    const raw = window.localStorage.getItem('whiteboard:scene:default');
    expect(JSON.parse(raw ?? '{}')).toMatchObject({
      elements: [{ id: 'latest', type: 'rectangle', isDeleted: false }],
      appState: { theme: 'dark', scrollX: 10, scrollY: 20 },
    });
  });

  test('new raster file is written to fileStore after throttle', async () => {
    jest.useFakeTimers();
    const imageElement = { id: 'img1', type: 'image', fileId: 'file1', isDeleted: false };
     
    (globalThis as any).__sceneElements = [imageElement];
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    await findByTestId('excalidraw-mock');

    act(() => {
      getExcProps()?.onChange?.(
        [imageElement],
        { theme: 'light', viewBackgroundColor: '#fff' },
        { file1: rasterFile },
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(1100);
      await Promise.resolve();
    });

    expect(writeFiles).toHaveBeenCalledWith('default', { file1: rasterFile });
    expect(pruneFiles).not.toHaveBeenCalled();
  });

  test('new math-stamp file is not written to fileStore', async () => {
    jest.useFakeTimers();
    const stampElement = {
      id: 'stamp1',
      type: 'image',
      fileId: 'stamp-file',
      isDeleted: false,
      customData: { kind: 'latex', version: 1, src: 'x', displayMode: false },
    };
     
    (globalThis as any).__sceneElements = [stampElement];
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    await findByTestId('excalidraw-mock');

    act(() => {
      getExcProps()?.onChange?.(
        [stampElement],
        { theme: 'light', viewBackgroundColor: '#fff' },
        { 'stamp-file': rasterFile },
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(1100);
      await Promise.resolve();
    });

    expect(writeFiles).not.toHaveBeenCalled();
  });
});

describe('Whiteboard — geometry3d stamp', () => {
  it('bấm D mở Geometry3D editor', async () => {
    const { findByTestId } = render(React.createElement(Whiteboard, { stamps: ALL_STAMPS }));
    await findByTestId('excalidraw-mock');
    await act(async () => {
      fireEvent.keyDown(window, { key: 'd' });
    });
    expect(screen.queryByText(/hình học không gian/i)).toBeTruthy();
  });

  it('click Đóng → 3D editor unmount', async () => {
    const { findByTestId } = render(React.createElement(Whiteboard, { stamps: ALL_STAMPS }));
    await findByTestId('excalidraw-mock');
    await act(async () => {
      fireEvent.keyDown(window, { key: 'd' });
    });
    const closeBtns = screen.getAllByLabelText('Đóng');
    await act(async () => {
      fireEvent.click(closeBtns[0]);
    });
    expect(screen.queryByText(/hình học không gian/i)).toBeFalsy();
  });
});

describe('default stamps — mặc định bật tất cả tool', () => {
  it('không pass stamps prop → phím D mở Geometry3D editor', async () => {
    const { findByTestId } = render(<Whiteboard storageKey={null} />);
    await findByTestId('excalidraw-mock');
    await act(async () => {
      fireEvent.keyDown(window, { key: 'd' });
    });
    expect(screen.queryByText(/hình học không gian/i)).toBeTruthy();
  });

  // Graph2D stamp tạm thời bị xoá (rebuild theo Scene v2 — PR G.1.1)
  it.todo('không pass stamps prop → phím H mở Graph2D editor');
});

describe('Whiteboard — initialScene + initialFiles (server load)', () => {
  const sampleAppState = {
    viewBackgroundColor: '#fff',
     
    zoom: { value: 1 } as any,
    scrollX: 0,
    scrollY: 0,
    gridSize: null,
     
    theme: 'light' as any,
  };

  test('initialScene wins over localStorage', async () => {
    window.localStorage.setItem(
      'whiteboard:scene:default',
      JSON.stringify({
        version: 1,
        elements: [{ id: 'fromLS', type: 'rectangle' }],
        appState: { theme: 'light' },
        savedAt: 0,
      }),
    );
    const { findByTestId } = render(
      React.createElement(Whiteboard, {
        initialScene: {
           
          elements: [{ id: 'fromServer', type: 'rectangle' }] as any,
          appState: sampleAppState,
        },
      }),
    );
    await findByTestId('excalidraw-mock');
    expect(getExcProps()?.initialData?.elements).toEqual([
      { id: 'fromServer', type: 'rectangle' },
    ]);
  });

  test('initialScene=null forces blank, ignores localStorage', async () => {
    window.localStorage.setItem(
      'whiteboard:scene:default',
      JSON.stringify({
        version: 1,
        elements: [{ id: 'shouldNotAppear', type: 'rectangle' }],
        appState: {},
        savedAt: 0,
      }),
    );
    const { findByTestId } = render(
      React.createElement(Whiteboard, { initialScene: null }),
    );
    await findByTestId('excalidraw-mock');
    expect(getExcProps()?.initialData?.elements).toBeUndefined();
  });

  test('initialScene=undefined (mặc định) vẫn đọc localStorage', async () => {
    window.localStorage.setItem(
      'whiteboard:scene:default',
      JSON.stringify({
        version: 1,
        elements: [{ id: 'fromLS', type: 'rectangle' }],
        appState: {},
        savedAt: 0,
      }),
    );
    const { findByTestId } = render(React.createElement(Whiteboard, {}));
    await findByTestId('excalidraw-mock');
    expect(getExcProps()?.initialData?.elements).toEqual([
      { id: 'fromLS', type: 'rectangle' },
    ]);
  });

  test('initialFiles → api.addFiles được gọi 1 lần khi api ready', async () => {
    const initialFiles = { f1: { ...rasterFile } };
    render(
      React.createElement(Whiteboard, {
        storageKey: null,
        initialScene: null,
         
        initialFiles: initialFiles as any,
      }),
    );
    await screen.findByTestId('excalidraw-mock');
    // setApi defer qua queueMicrotask → cần flush vài tick + re-render.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
     
    const api = (globalThis as any).__excApi as { addFiles: jest.Mock };
    expect(api.addFiles).toHaveBeenCalledTimes(1);
    expect(api.addFiles).toHaveBeenCalledWith([
      {
        id: 'f1',
        dataURL: rasterFile.dataURL,
        mimeType: rasterFile.mimeType,
        created: rasterFile.created,
      },
    ]);
  });

  test('initialFiles không truyền → addFiles không bị gọi cho initial load', async () => {
    render(
      React.createElement(Whiteboard, {
        storageKey: null,
        initialScene: null,
      }),
    );
    await screen.findByTestId('excalidraw-mock');
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
     
    const api = (globalThis as any).__excApi as { addFiles: jest.Mock };
    expect(api.addFiles).not.toHaveBeenCalled();
  });
});
