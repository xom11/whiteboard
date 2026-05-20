'use client';
import React from 'react';
import { render, screen } from '@testing-library/react';
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
  it('render shell: stamp-left-panel + graph-miniboard + dialog', () => {
    const { getByTestId } = render(
      <GraphEditorPanel initialState={null} onInsert={() => {}} onClose={() => {}} />,
    );
    expect(getByTestId('stamp-left-panel')).toBeInTheDocument();
    expect(getByTestId('graph-miniboard')).toBeInTheDocument();
    expect(getByTestId('graph-editor-panel')).toBeInTheDocument();
  });

  it('nút Huỷ gọi onClose', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <GraphEditorPanel initialState={null} onInsert={() => {}} onClose={onClose} />,
    );
    // Close button in header
    const closeBtn = getByTestId('graph-editor-close-btn');
    closeBtn.click();
    expect(onClose).toHaveBeenCalled();
  });
});
