import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolGrid } from '../ToolGrid';

const TOOLS = [
  { key: 'point', label: 'Điểm mới', hint: 'Click để thêm điểm', icon: <span>P</span>, group: 'g1' },
  { key: 'circ', label: 'Đường tròn nội tiếp', hint: 'Click 3 đỉnh', icon: <span>C</span>, group: 'g2' },
] as const;
const groupOrder = ['g1', 'g2'] as const;
const groupLabels = { g1: 'Nhóm 1', g2: 'Nhóm 2' } as Record<string, string>;

function setup() {
  return render(
    <ToolGrid
      tools={TOOLS as never}
      groupOrder={groupOrder as never}
      groupLabels={groupLabels}
      activeTool={'point' as never}
      onToolChange={() => {}}
    />,
  );
}

test('grid mode (no query) ẩn tên, hiện group header', () => {
  setup();
  expect(screen.getByText('Nhóm 1')).toBeInTheDocument();
  // Tên tool KHÔNG render dạng text trong grid (chỉ icon + aria-label/title).
  expect(screen.queryByText('Đường tròn nội tiếp')).not.toBeInTheDocument();
});

test('list mode (có query) hiện tên + hint, bỏ group header', () => {
  setup();
  fireEvent.change(screen.getByTestId('tool-search-input'), { target: { value: 'tròn' } });
  expect(screen.getByText('Đường tròn nội tiếp')).toBeInTheDocument();
  expect(screen.getByText('Click 3 đỉnh')).toBeInTheDocument();
  expect(screen.queryByText('Nhóm 1')).not.toBeInTheDocument();
  // Vẫn là button có data-tool để click chọn tool.
  expect(screen.getByRole('button', { name: 'Đường tròn nội tiếp' })).toHaveAttribute('data-tool', 'circ');
});
