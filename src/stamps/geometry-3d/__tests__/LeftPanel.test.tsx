import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftPanel } from '../editor/LeftPanel';
import { Scene3D } from '../editor/scene/Scene3D';

describe('LeftPanel (new tabbed)', () => {
  test('shows Tools tab by default', () => {
    const scene = new Scene3D();
    render(
      <LeftPanel scene={scene} selectedTool="move" onSelectTool={() => undefined} />,
    );
    expect(screen.getByTestId('tool-palette')).toBeInTheDocument();
  });

  test('switches to Algebra tab', () => {
    const scene = new Scene3D();
    render(
      <LeftPanel scene={scene} selectedTool="move" onSelectTool={() => undefined} />,
    );
    fireEvent.click(screen.getByText(/Algebra/));
    expect(screen.getByTestId('algebra-list')).toBeInTheDocument();
  });
});
