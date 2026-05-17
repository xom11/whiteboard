import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolPalette } from '../../editor/toolPanel/ToolPalette';

test('ToolPalette renders tool groups and selects on click', () => {
  const onSelect = jest.fn();
  render(<ToolPalette selected="move" onSelect={onSelect} />);
  // The "move" button is rendered (aria-label, no visible text in new SVG-only buttons)
  const moveBtn = screen.getByTestId('tool-move');
  expect(moveBtn).toBeInTheDocument();
  expect(moveBtn.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByTestId('tool-point'));
  expect(onSelect).toHaveBeenCalledWith('point');
});

test('ToolPalette shows selected tool with aria-pressed=true', () => {
  render(<ToolPalette selected="point" onSelect={() => {}} />);
  const pointBtn = screen.getByTestId('tool-point');
  expect(pointBtn.getAttribute('aria-pressed')).toBe('true');
});

test('ToolPalette renders chord letter A..F for groups', () => {
  render(<ToolPalette selected="move" onSelect={() => {}} />);
  expect(screen.getByTestId('chord-letter-basic').textContent).toBe('A');
  expect(screen.getByTestId('chord-letter-point').textContent).toBe('B');
  expect(screen.getByTestId('chord-letter-line').textContent).toBe('C');
  expect(screen.getByTestId('chord-letter-curve').textContent).toBe('F');
});
