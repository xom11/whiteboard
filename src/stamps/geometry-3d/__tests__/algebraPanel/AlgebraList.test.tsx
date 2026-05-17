import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import { Scene3D } from '../../editor/scene/Scene3D';
import { AlgebraList } from '../../editor/algebraPanel/AlgebraList';

test('AlgebraList renders empty placeholder when scene has no objects', () => {
  const scene = new Scene3D();
  render(<AlgebraList scene={scene} />);
  expect(screen.getByText(/Chưa có đối tượng/)).toBeInTheDocument();
});

test('AlgebraList re-renders when a point is added', () => {
  const scene = new Scene3D();
  render(<AlgebraList scene={scene} />);
  act(() => {
    scene.addPoint({ kind: 'onGround', x: 1, y: 2 });
  });
  expect(screen.getByText(/Point\(xyPlane\)/)).toBeInTheDocument();
});

test('AlgebraList removes row on scene.delete', () => {
  const scene = new Scene3D();
  const id = scene.addPoint({ kind: 'onGround', x: 1, y: 2 });
  render(<AlgebraList scene={scene} />);
  expect(screen.getByText(/Point\(xyPlane\)/)).toBeInTheDocument();
  act(() => {
    scene.delete(id);
  });
  expect(screen.queryByText(/Point\(xyPlane\)/)).not.toBeInTheDocument();
});
