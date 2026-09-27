import { render } from '@testing-library/react';
import React from 'react';
import { GeometryStampHost } from '../host';
import type { GeometryEditorPanelHandle } from '../editor/EditorPanel';
import type { StampLeftPanelSearchProps } from '../../shared/StampLeftPanel/types';
import { parseSceneState } from '../../graph-2d/serialize';
import type { Graph2DCustomData } from '../../graph-2d/types';

jest.mock('../editor/EditorPanel', () => {
  const actual = jest.requireActual('../editor/EditorPanel');
  const React = jest.requireActual('react');
  const MockPanel = React.forwardRef<GeometryEditorPanelHandle>(function MockPanel(_props, ref) {
    React.useImperativeHandle(
      ref,
      (): GeometryEditorPanelHandle => ({
        insert: () => false,
        hasContent: () => false,
        selectObject: () => {},
      }),
    );
    return null;
  });
  return { ...actual, GeometryEditorPanel: MockPanel };
});

// Bắt prop `search` host truyền xuống panel trái.
let capturedSearch: StampLeftPanelSearchProps | undefined;
jest.mock('../../shared/StampLeftPanel', () => ({
  StampLeftPanel: (props: { search?: StampLeftPanelSearchProps }) => {
    capturedSearch = props.search;
    return null;
  },
}));

/**
 * Editor Dựng hình học: gõ một hàm số vào ô "Tìm công cụ" → gợi ý chuyển sang
 * Đồ thị 2D đã điền sẵn hàm đó.
 */
describe('GeometryStampHost — gõ hàm số → chuyển sang Đồ thị 2D', () => {
  beforeEach(() => {
    capturedSearch = undefined;
  });

  function renderHost(opts: { canGraph: boolean; onOpenStamp?: jest.Mock }) {
    render(
      <GeometryStampHost
        api={{}}
        editingElement={null}
        onClose={() => {}}
        isDark={false}
        canOpenStamp={(kind) => opts.canGraph && kind === 'graph2d'}
        onOpenStamp={opts.onOpenStamp}
      />,
    );
  }

  it('Whiteboard có stamp đồ thị → ô tìm nhắc gõ hàm + gợi ý khi gõ đúng hàm', () => {
    renderHost({ canGraph: true, onOpenStamp: jest.fn() });

    expect(capturedSearch?.placeholder).toMatch(/hàm số/);
    const action = capturedSearch?.actionForQuery?.('y = x^2 - 2x');
    expect(action).toMatchObject({ label: 'Vẽ đồ thị y = x^2-2*x', testId: 'tool-search-graph2d' });
  });

  it('bấm gợi ý → mở graph2d với đúng hàm đã gõ (dữ liệu gieo hợp lệ)', () => {
    const onOpenStamp = jest.fn();
    renderHost({ canGraph: true, onOpenStamp });

    capturedSearch!.actionForQuery!('f(x) = (x-1)(x+2)')!.onRun();

    expect(onOpenStamp).toHaveBeenCalledTimes(1);
    const [kind, seed] = onOpenStamp.mock.calls[0] as [string, Graph2DCustomData];
    expect(kind).toBe('graph2d');
    const state = parseSceneState(seed.jsonState)!;
    expect(state.objects.f1).toMatchObject({ kind: 'function2d', attrs: { expression: '(x-1)*(x+2)' } });
  });

  it('chữ tìm công cụ bình thường → KHÔNG có gợi ý (danh sách công cụ như cũ)', () => {
    renderHost({ canGraph: true, onOpenStamp: jest.fn() });

    for (const q of ['trung điểm', 'đường tròn', 'text', 'max']) {
      expect(capturedSearch!.actionForQuery!(q)).toBeNull();
    }
  });

  it('Whiteboard KHÔNG đăng ký stamp đồ thị → không nhắc, không gợi ý (tránh nút bấm không ăn)', () => {
    renderHost({ canGraph: false, onOpenStamp: jest.fn() });

    expect(capturedSearch).toBeUndefined();
  });

  it('host dùng ngoài Whiteboard (không có onOpenStamp) → không bật', () => {
    renderHost({ canGraph: true });

    expect(capturedSearch).toBeUndefined();
  });
});
