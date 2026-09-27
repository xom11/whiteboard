import React, { forwardRef, useImperativeHandle } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { Whiteboard } from '../Whiteboard';
import type { StampHostProps, StampHostHandle, StampType } from '../stamps/shared/types';

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
  // `Item` render thành <button> thật (khác DefaultItems trả null) để test
  // bấm được mục menu tự viết, ví dụ nút bật nền kẻ dòng.

  const Item = ({ children, onSelect, icon, ...rest }: any) =>
    React.createElement(
      'button',
      { type: 'button', onClick: onSelect, ...rest },
      children,
    );
  const MainMenu = Object.assign(NoopChildren, {
    DefaultItems: {
      LoadScene: DefaultItem,
      SaveAsImage: DefaultItem,
      ClearCanvas: DefaultItem,
      ToggleTheme: DefaultItem,
    },
    Item,
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


/**
 * Chuyển stamp từ BÊN TRONG host (Dựng hình → Đồ thị 2D) qua
 * `onOpenStamp` + `initialCustomData`. Dùng 2 stamp giả để khoá đúng hợp đồng
 * Whiteboard ↔ Host, không phụ thuộc JSXGraph.
 *
 * Stamp A mô phỏng GeometryStudio: tryInsert() chèn BẤT ĐỒNG BỘ rồi mới gọi
 * onClose() — đúng thứ tự thật (handleInsert: await onCommit → onClose).
 */
function makeStamps(): StampType[] {
  const HostA = forwardRef<StampHostHandle, StampHostProps>(function HostA(props, ref) {
    useImperativeHandle(ref, () => ({
      tryInsert: () => {
        (globalThis as any).__daChenA = true;
        void Promise.resolve().then(() => props.onClose());
        return true;
      },
      hasContent: () => true,
    }));
    return (
      <div data-testid="host-a">
        <span data-testid="a-co-the-mo-b">{String(props.canOpenStamp?.('b'))}</span>
        <button type="button" onClick={() => props.onOpenStamp?.('b', { ham: 'x^2' })}>
          Sang B
        </button>
      </div>
    );
  });
  const HostB = forwardRef<StampHostHandle, StampHostProps>(function HostB(props, ref) {
    useImperativeHandle(ref, () => ({ tryInsert: () => false, hasContent: () => false }));
    return (
      <div data-testid="host-b">
        <span data-testid="b-gieo">{JSON.stringify(props.initialCustomData ?? null)}</span>
        <span data-testid="b-sua">{JSON.stringify(props.editingElement)}</span>
        <button type="button" onClick={props.onClose}>Đóng B</button>
      </div>
    );
  });
  const base = { toolbarLabel: '?', toolbarTitle: '?', toolbarIcon: null };
  return [
    { ...base, kind: 'a', shortcutKey: 'q', Host: HostA },
    { ...base, kind: 'b', shortcutKey: 'w', Host: HostB },
  ];
}

async function moWhiteboard(stamps: StampType[]) {
  render(<Whiteboard storageKey={null} stamps={stamps} />);
  await screen.findByTestId('excalidraw-mock');
}

async function bamPhim(key: string) {
  await act(async () => {
    fireEvent.keyDown(window, { key });
  });
}

beforeEach(() => {
  (globalThis as any).__excProps = null;
  (globalThis as any).__sceneElements = [];
  (globalThis as any).__daChenA = false;
});

describe('Whiteboard — chuyển stamp từ trong host (onOpenStamp)', () => {
  it('mở B với dữ liệu gieo; B là stamp MỚI, không phải re-edit', async () => {
    await moWhiteboard(makeStamps());
    await bamPhim('q');

    await act(async () => {
      fireEvent.click(screen.getByText('Sang B'));
    });

    expect(screen.getByTestId('host-b')).toBeInTheDocument();
    expect(screen.queryByTestId('host-a')).toBeNull();
    expect(screen.getByTestId('b-gieo').textContent).toBe('{"ham":"x^2"}');
    expect(screen.getByTestId('b-sua').textContent).toBe('null');
  });

  it('chèn nội dung dở dang của A TRƯỚC khi chuyển (như bấm ra ngoài) — không mất hình', async () => {
    await moWhiteboard(makeStamps());
    await bamPhim('q');
    await act(async () => {
      fireEvent.click(screen.getByText('Sang B'));
    });

    expect((globalThis as any).__daChenA).toBe(true);
  });

  // Lỗi thật trong bản đầu: GeometryStudio chèn xong (bất đồng bộ) mới gọi
  // onClose; onClose trần = closeStamp đóng stamp ĐANG MỞ — tức B vừa mở.
  it('onClose MUỘN của A (sau khi chèn xong) KHÔNG đóng B vừa mở', async () => {
    await moWhiteboard(makeStamps());
    await bamPhim('q');
    await act(async () => {
      fireEvent.click(screen.getByText('Sang B'));
    });
    // Cho promise chèn của A chạy xong → A gọi onClose của phiên CŨ.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('host-b')).toBeInTheDocument();
  });

  it('onClose của chính B vẫn đóng được B', async () => {
    await moWhiteboard(makeStamps());
    await bamPhim('q');
    await act(async () => {
      fireEvent.click(screen.getByText('Sang B'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Đóng B'));
    });

    expect(screen.queryByTestId('host-b')).toBeNull();
  });

  it('dữ liệu gieo KHÔNG dính sang lần mở B sau (bằng phím tắt)', async () => {
    await moWhiteboard(makeStamps());
    await bamPhim('q');
    await act(async () => {
      fireEvent.click(screen.getByText('Sang B'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Đóng B'));
    });
    await bamPhim('w');

    expect(screen.getByTestId('b-gieo').textContent).toBe('null');
  });

  it('canOpenStamp phản ánh đúng các stamp đã đăng ký', async () => {
    const [a] = makeStamps();
    await moWhiteboard([a]);
    await bamPhim('q');

    expect(screen.getByTestId('a-co-the-mo-b').textContent).toBe('false');
  });
});
