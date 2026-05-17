import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolPalette } from '../../editor/toolPanel/ToolPalette';

test('ToolPalette renders tool groups and selects on click', () => {
  const onSelect = jest.fn();
  render(<ToolPalette selected="move" onSelect={onSelect} />);
  // The "move" button is rendered and selected (aria-pressed=true)
  const moveButtons = screen.getAllByText('Di chuyển');
  expect(moveButtons.length).toBeGreaterThan(0);
  // Click the Point button (first occurrence)
  const pointButtons = screen.getAllByText('Điểm');
  fireEvent.click(pointButtons[0]);
  expect(onSelect).toHaveBeenCalledWith('point');
});

test('ToolPalette shows selected tool with aria-pressed=true', () => {
  render(<ToolPalette selected="point" onSelect={() => {}} />);
  const pointBtn = screen.getAllByRole('button').find(
    (b) => b.getAttribute('data-tool-key') === 'point',
  );
  expect(pointBtn).toBeDefined();
  expect(pointBtn?.getAttribute('aria-pressed')).toBe('true');
});
