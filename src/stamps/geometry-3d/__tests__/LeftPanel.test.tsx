import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftPanel } from '../editor/LeftPanel';
import { Scene3D } from '../editor/scene/Scene3D';

const defaultProps = {
  selectedTool: 'move' as const,
  onSelectTool: () => undefined,
  onUndo: () => undefined,
  canUndo: false,
  onRedo: () => undefined,
  canRedo: false,
  onClose: () => undefined,
};

describe('LeftPanel (new tabbed)', () => {
  test('shows Tools tab by default', () => {
    const scene = new Scene3D();
    render(
      <LeftPanel scene={scene} {...defaultProps} />,
    );
    expect(screen.getByTestId('tool-palette')).toBeInTheDocument();
  });

  test('switches to Algebra tab', () => {
    const scene = new Scene3D();
    render(
      <LeftPanel scene={scene} {...defaultProps} />,
    );
    fireEvent.click(screen.getByText(/Algebra/));
    expect(screen.getByTestId('algebra-list')).toBeInTheDocument();
  });

  it('Redo button enabled khi canRedo=true', () => {
    const scene = new Scene3D();
    const onRedo = jest.fn();
    render(
      <LeftPanel
        scene={scene}
        selectedTool="move"
        onSelectTool={() => {}}
        onUndo={() => {}}
        canUndo={false}
        onRedo={onRedo}
        canRedo={true}
      />,
    );
    const btn = screen.getByTestId('redo-btn');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('Redo button disabled khi canRedo=false', () => {
    const scene = new Scene3D();
    render(
      <LeftPanel
        scene={scene}
        selectedTool="move"
        onSelectTool={() => {}}
        onUndo={() => {}}
        canUndo={true}
        onRedo={() => {}}
        canRedo={false}
      />,
    );
    expect(screen.getByTestId('redo-btn')).toBeDisabled();
  });

  it('Undo button enabled khi canUndo=true', () => {
    const scene = new Scene3D();
    const onUndo = jest.fn();
    render(
      <LeftPanel
        scene={scene}
        selectedTool="move"
        onSelectTool={() => {}}
        onUndo={onUndo}
        canUndo={true}
        onRedo={() => {}}
        canRedo={false}
      />,
    );
    const btn = screen.getByTestId('undo-btn');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('Undo button disabled khi canUndo=false', () => {
    const scene = new Scene3D();
    render(
      <LeftPanel
        scene={scene}
        selectedTool="move"
        onSelectTool={() => {}}
        onUndo={() => {}}
        canUndo={false}
        onRedo={() => {}}
        canRedo={false}
      />,
    );
    expect(screen.getByTestId('undo-btn')).toBeDisabled();
  });
});
