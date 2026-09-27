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

describe('ô tìm — hành động theo chữ gõ (search.actionForQuery)', () => {
  function setupWithAction(onRun = jest.fn()) {
    render(
      <ToolGrid
        tools={TOOLS as never}
        groupOrder={groupOrder as never}
        groupLabels={groupLabels}
        activeTool={'point' as never}
        onToolChange={() => {}}
        search={{
          placeholder: 'Tìm công cụ hoặc gõ hàm số',
          // Chỉ chuỗi bắt đầu "y=" có hành động — giả lập nhận dạng hàm số.
          actionForQuery: (q) =>
            q.startsWith('y=') ? { label: `Vẽ đồ thị ${q}`, hint: 'Chuyển sang Đồ thị 2D', testId: 'act', onRun } : null,
        }}
      />,
    );
    return { onRun, input: screen.getByTestId('tool-search-input') };
  }

  test('placeholder tuỳ biến được', () => {
    const { input } = setupWithAction();
    expect(input).toHaveAttribute('placeholder', 'Tìm công cụ hoặc gõ hàm số');
  });

  test('chữ có hành động → hiện gợi ý; bấm là chạy', () => {
    const { onRun, input } = setupWithAction();
    fireEvent.change(input, { target: { value: 'y=x^2' } });

    expect(screen.getByTestId('act')).toHaveTextContent('Vẽ đồ thị y=x^2');
    fireEvent.click(screen.getByTestId('act'));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  test('Enter trong ô tìm chạy hành động', () => {
    const { onRun, input } = setupWithAction();
    fireEvent.change(input, { target: { value: 'y=x^2' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRun).toHaveBeenCalledTimes(1);
  });

  test('có hành động thì KHÔNG hiện "Không có công cụ nào khớp" (chữ gõ vốn không để tìm công cụ)', () => {
    const { input } = setupWithAction();
    fireEvent.change(input, { target: { value: 'y=x^2' } });

    expect(screen.queryByTestId('tool-search-empty')).not.toBeInTheDocument();
  });

  test('chữ không có hành động → không gợi ý, Enter không làm gì, tìm công cụ như cũ', () => {
    const { onRun, input } = setupWithAction();
    fireEvent.change(input, { target: { value: 'tròn' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.queryByTestId('act')).not.toBeInTheDocument();
    expect(onRun).not.toHaveBeenCalled();
    expect(screen.getByText('Đường tròn nội tiếp')).toBeInTheDocument();
  });

  test('không truyền search → placeholder mặc định, không đổi hành vi cũ', () => {
    setup();
    expect(screen.getByTestId('tool-search-input')).toHaveAttribute('placeholder', 'Tìm công cụ…');
  });
});
