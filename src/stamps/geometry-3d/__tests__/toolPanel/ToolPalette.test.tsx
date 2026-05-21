// Integration test: 3D's TOOLS_FLAT wire vào StampLeftPanel đúng.
// (Trước Phase 3 từng test trực tiếp ToolPalette — đã extract vào StampLeftPanel template.)
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StampLeftPanel } from '../../../shared/StampLeftPanel';
import {
  TOOLS_FLAT,
  GROUP_ORDER,
  GROUP_LABELS,
  letterForGroup,
  type Geom3DGroup,
} from '../../editor/toolPanel/groups';
import type { ToolKey } from '../../editor/tools/spec';

function mount(activeTool: ToolKey = 'move') {
  const onToolChange = jest.fn();
  return {
    onToolChange,
    ...render(
      <StampLeftPanel<ToolKey, Geom3DGroup>
        title="Hình học 3D"
        icon={<span />}
        tools={TOOLS_FLAT}
        groupOrder={GROUP_ORDER}
        groupLabels={GROUP_LABELS}
        activeTool={activeTool}
        onToolChange={onToolChange}
        chord={{ activeGroup: null, letterForGroup }}
        onClose={() => {}}
      />,
    ),
  };
}

test('TOOLS_FLAT renders tool buttons + selection on click', () => {
  const { onToolChange } = mount('move');
  const moveBtn = screen.getByLabelText('Di chuyển');
  expect(moveBtn).toBeInTheDocument();
  expect(moveBtn.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByLabelText('Điểm'));
  expect(onToolChange).toHaveBeenCalledWith('point');
});

test('active tool có aria-pressed=true', () => {
  mount('point');
  expect(screen.getByLabelText('Điểm').getAttribute('aria-pressed')).toBe('true');
});

test('chord letter A..F render đúng cho 6 group 3D', () => {
  mount('move');
  expect(screen.getByTestId('chord-letter-basic').textContent).toBe('A');
  expect(screen.getByTestId('chord-letter-point').textContent).toBe('B');
  expect(screen.getByTestId('chord-letter-line').textContent).toBe('C');
  expect(screen.getByTestId('chord-letter-curve').textContent).toBe('F');
});
