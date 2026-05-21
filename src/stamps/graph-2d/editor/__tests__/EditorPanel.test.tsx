'use client';
import React from 'react';
import { render } from '@testing-library/react';
import { GraphEditorPanel } from '../EditorPanel';

jest.mock('jsxgraph', () => ({
  __esModule: true,
  default: {
    JSXGraph: {
      initBoard: jest.fn(() => ({
        getBoundingBox: () => [-10, 10, 10, -10],
        create: jest.fn(() => ({ removeObject: jest.fn(), X: () => 0, Y: () => 0 })),
        removeObject: jest.fn(),
        getUsrCoordsOfMouse: () => [0, 0, 0],
        on: jest.fn(),
        update: jest.fn(),
      })),
      freeBoard: jest.fn(),
    },
    Options: {},
  },
}));

describe('GraphEditorPanel smoke', () => {
  it('render shell: graph-miniboard + dialog (LeftPanel ở host, không trong panel)', () => {
    const { getByTestId, queryByTestId } = render(
      <GraphEditorPanel initialState={null} onInsert={() => {}} onClose={() => {}} />,
    );
    expect(getByTestId('graph-miniboard')).toBeInTheDocument();
    expect(getByTestId('graph-editor-panel')).toBeInTheDocument();
    // LeftPanel is now rendered by host, NOT inside EditorPanel.
    expect(queryByTestId('stamp-left-panel')).toBeNull();
  });

  it('nút Huỷ gọi onClose', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <GraphEditorPanel initialState={null} onInsert={() => {}} onClose={onClose} />,
    );
    const closeBtn = getByTestId('graph-editor-close-btn');
    closeBtn.click();
    expect(onClose).toHaveBeenCalled();
  });
});
