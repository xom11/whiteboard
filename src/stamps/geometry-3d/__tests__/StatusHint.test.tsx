import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusHint } from '../editor/StatusHint';

test('StatusHint renders hint text', () => {
  render(<StatusHint hint="Chọn điểm thứ nhất" />);
  expect(screen.getByText(/Chọn điểm thứ nhất/)).toBeInTheDocument();
});

test('StatusHint renders hover label suffix', () => {
  render(<StatusHint hint="Vẽ đoạn thẳng" hoverLabel="trục Z" />);
  expect(screen.getByText(/trục Z/)).toBeInTheDocument();
});

test('StatusHint shows fallback when hint empty', () => {
  render(<StatusHint hint="" />);
  expect(screen.getByText(/Chọn công cụ/)).toBeInTheDocument();
});
