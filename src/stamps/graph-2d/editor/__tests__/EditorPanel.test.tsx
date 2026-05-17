// src/stamps/graph-2d/editor/__tests__/EditorPanel.test.tsx
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { GraphEditorPanel, type GraphEditorPanelHandle } from '../EditorPanel';
import { EMPTY_GRAPH } from '../../serialize';

jest.mock('jsxgraph', () => ({
  __esModule: true,
  default: {
    JSXGraph: {
      initBoard: jest.fn(() => ({
        create: jest.fn(() => ({})),
        update: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        getBoundingBox: () => [-10, 10, 10, -10],
        objects: {},
        removeObject: jest.fn(),
      })),
      freeBoard: jest.fn(),
    },
    Options: { text: {}, label: {} },
  },
}));

describe('GraphEditorPanel', () => {
  it('mount với initialState=null tạo empty graph', () => {
    const ref = createRef<GraphEditorPanelHandle>();
    render(
      <GraphEditorPanel
        ref={ref}
        initialState={null}
        onInsert={jest.fn()}
        onClose={jest.fn()}
        onStateChange={jest.fn()}
        withLeftPanel={false}
        isDark={false}
        isMobile={false}
        onOpenDrawer={jest.fn()}
      />,
    );
    expect(ref.current?.hasContent()).toBe(false);
  });

  it('addFunction valid: thêm vào graph, hasContent → true', () => {
    const ref = createRef<GraphEditorPanelHandle>();
    const onStateChange = jest.fn();
    render(
      <GraphEditorPanel
        ref={ref}
        initialState={null}
        onInsert={jest.fn()}
        onClose={jest.fn()}
        onStateChange={onStateChange}
        withLeftPanel={false}
        isDark={false}
        isMobile={false}
        onOpenDrawer={jest.fn()}
      />,
    );
    const result = ref.current?.addFunction('x^2');
    expect(result?.ok).toBe(true);
    expect(ref.current?.hasContent()).toBe(true);
  });

  it('addFunction invalid: trả { ok: false, error }', () => {
    const ref = createRef<GraphEditorPanelHandle>();
    render(
      <GraphEditorPanel
        ref={ref}
        initialState={null}
        onInsert={jest.fn()}
        onClose={jest.fn()}
        onStateChange={jest.fn()}
        withLeftPanel={false}
        isDark={false}
        isMobile={false}
        onOpenDrawer={jest.fn()}
      />,
    );
    const result = ref.current?.addFunction('foo(x)');
    expect(result?.ok).toBe(false);
  });

  it('initialState là SerializedGraph có sẵn: load đúng', () => {
    const ref = createRef<GraphEditorPanelHandle>();
    render(
      <GraphEditorPanel
        ref={ref}
        initialState={{
          ...EMPTY_GRAPH,
          functions: [
            { id: 'f1', name: 'f', expression: 'sin(x)', color: '#000', visible: true },
          ],
        }}
        onInsert={jest.fn()}
        onClose={jest.fn()}
        onStateChange={jest.fn()}
        withLeftPanel={false}
        isDark={false}
        isMobile={false}
        onOpenDrawer={jest.fn()}
      />,
    );
    expect(ref.current?.hasContent()).toBe(true);
  });
});
