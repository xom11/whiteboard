import React, { forwardRef, lazy, Suspense, useImperativeHandle } from 'react';
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


async function bamPhim(key: string) {
  await act(async () => {
    fireEvent.keyDown(window, { key });
  });
}

/**
 * Lỗi MẤT DỮ LIỆU có sẵn ở v0.39.0 (tái hiện 2/2 trên playground bản gốc): vẽ
 * lên bảng rồi mở LẦN ĐẦU một stamp nạp lazy (Hình học G, Đồ thị H) ⇒ bảng
 * trắng trơn, localStorage bị ghi đè rỗng.
 *
 * Host lazy suspend lúc chunk đang tải. Không có Suspense riêng quanh host thì
 * boundary gần nhất là của CONSUMER (next/dynamic) — bọc cả Whiteboard — nên
 * React ẩn luôn Excalidraw. Excalidraw là class component: bị ẩn = chạy
 * componentWillUnmount (scene.destroy + new Scene) ⇒ scene mất.
 */
describe('Whiteboard — stamp lazy đang tải KHÔNG được ẩn Excalidraw', () => {
  it('mở stamp có chunk chưa tải xong → bảng vẫn hiển thị, fallback của consumer không bật', async () => {
    let xongTai!: (m: { default: StampType['Host'] }) => void;
    const HostLazy = lazy(
      () => new Promise<{ default: StampType['Host'] }>((resolve) => { xongTai = resolve; }),
    );
    const stamps: StampType[] = [
      { kind: 'c', shortcutKey: 'e', toolbarLabel: '?', toolbarTitle: '?', toolbarIcon: null, Host: HostLazy },
    ];

    // Như consumer nhúng bảng qua next/dynamic: có Suspense bọc NGOÀI Whiteboard.
    render(
      <Suspense fallback={<div data-testid="fallback-consumer" />}>
        <Whiteboard storageKey={null} stamps={stamps} />
      </Suspense>,
    );
    await screen.findByTestId('excalidraw-mock');

    await bamPhim('e'); // chunk của stamp c chưa về ⇒ host đang suspend

    expect(screen.queryByTestId('fallback-consumer')).toBeNull();
    expect(screen.getByTestId('excalidraw-mock')).toBeVisible();

    // Chunk về → host hiện ra bình thường.
    const HostThat = forwardRef<StampHostHandle, StampHostProps>(function HostThat(_p, ref) {
      useImperativeHandle(ref, () => ({ tryInsert: () => false, hasContent: () => false }));
      return <div data-testid="host-c" />;
    });
    await act(async () => {
      xongTai({ default: HostThat });
    });
    expect(await screen.findByTestId('host-c')).toBeInTheDocument();
  });
});
