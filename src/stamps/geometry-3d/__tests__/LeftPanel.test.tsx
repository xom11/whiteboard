import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftPanel } from '../editor/LeftPanel';
import { Scene3D } from '../editor/scene/Scene3D';

function renderPanel(overrides: Partial<React.ComponentProps<typeof LeftPanel>> = {}) {
  const scene = new Scene3D();
  return render(
    <LeftPanel
      scene={scene}
      selectedTool="move"
      onSelectTool={() => undefined}
      showAxis
      showGrid
      onShowAxisChange={() => undefined}
      onShowGridChange={() => undefined}
      onUndo={() => undefined}
      canUndo={false}
      onRedo={() => undefined}
      canRedo={false}
      onClose={() => undefined}
      {...overrides}
    />,
  );
}

describe('LeftPanel (3D — aligned with 2D)', () => {
  test('desktop renders Shell with title + close', () => {
    renderPanel();
    expect(screen.getByTestId('left-panel')).toBeInTheDocument();
    expect(screen.getByText(/Hình học 3D/)).toBeInTheDocument();
  });

  test('shows tool palette by default (Tools tab active)', () => {
    renderPanel();
    expect(screen.getByTestId('tool-palette')).toBeInTheDocument();
  });

  test('renders "Góc nhìn" section with Trục/Lưới/Undo controls', () => {
    renderPanel();
    expect(screen.getByTestId('toggle-axis')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-grid')).toBeInTheDocument();
    expect(screen.getByTestId('undo-btn')).toBeInTheDocument();
  });

  test('switches to Algebra tab via tab-algebra pill', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('tab-algebra'));
    expect(screen.getByTestId('algebra-list')).toBeInTheDocument();
  });

  test('tool button uses emerald palette when selected', () => {
    renderPanel({ selectedTool: 'point' });
    const btn = screen.getByTestId('tool-point');
    expect(btn.className).toMatch(/bg-emerald-600/);
  });

  test('chord group highlight shows when chordGroup is set', () => {
    renderPanel({ chordGroup: 'point' });
    expect(screen.getByTestId('chord-hint')).toBeInTheDocument();
    const sectionLetter = screen.getByTestId('chord-letter-point');
    expect(sectionLetter.textContent).toBe('B');
  });

  test('mobile renders MobileToolDrawer when isMobile + drawerOpen', () => {
    renderPanel({ isMobile: true, drawerOpen: true });
    expect(screen.getByTestId('left-panel')).toBeInTheDocument();
  });
});

describe('LeftPanel — undo/redo buttons', () => {
  it('Undo button enabled khi canUndo=true', () => {
    const onUndo = jest.fn();
    renderPanel({ onUndo, canUndo: true });
    const btn = screen.getByTestId('undo-btn');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('Undo button disabled khi canUndo=false', () => {
    renderPanel({ canUndo: false });
    expect(screen.getByTestId('undo-btn')).toBeDisabled();
  });

  it('Redo button rendered + enabled khi canRedo=true', () => {
    const onRedo = jest.fn();
    renderPanel({ onRedo, canRedo: true });
    const btn = screen.getByTestId('redo-btn');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('Redo button disabled khi canRedo=false', () => {
    renderPanel({ canRedo: false });
    expect(screen.getByTestId('redo-btn')).toBeDisabled();
  });
});
