// AiFigurePrompt: thông báo partial to-do hiện sau khi dựng + nút × đóng hẳn.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createEmptyState, type State } from '../../../../core/scene';
import type { GenerateGeometryFigure } from '../../../shared/types';
import { AiFigurePrompt } from '../AiFigurePrompt';

function someState(): State {
  return { ...createEmptyState('2d'), counter: 0 };
}

describe('AiFigurePrompt — partial notice', () => {
  function partialGenerator(): GenerateGeometryFigure {
    return jest.fn(async () => ({
      ok: true as const,
      state: someState(),
      partial: { message: '✏️ Bạn tự dựng nốt:\n• P (chưa dựng được)' },
    }));
  }

  async function submitWith(generator: GenerateGeometryFigure) {
    render(<AiFigurePrompt generator={generator} onGenerated={() => {}} />);
    fireEvent.change(screen.getByTestId('geometry-ai-textarea'), {
      target: { value: 'Cho tam giác ABC, P là điểm Fermat.' },
    });
    fireEvent.click(screen.getByTestId('geometry-ai-submit'));
    await waitFor(() => expect(screen.getByTestId('geometry-ai-partial-notice')).toBeTruthy());
  }

  it('hiện notice sau khi dựng partial', async () => {
    await submitWith(partialGenerator());
    expect(screen.getByTestId('geometry-ai-partial-notice').textContent).toContain('P');
  });

  it('bấm × → ẩn notice hẳn', async () => {
    await submitWith(partialGenerator());
    fireEvent.click(screen.getByTestId('geometry-ai-partial-dismiss'));
    expect(screen.queryByTestId('geometry-ai-partial-notice')).toBeNull();
  });

  it('full success (không partial) → không hiện notice', async () => {
    const gen: GenerateGeometryFigure = jest.fn(async () => ({
      ok: true as const,
      state: someState(),
    }));
    render(<AiFigurePrompt generator={gen} onGenerated={() => {}} />);
    fireEvent.change(screen.getByTestId('geometry-ai-textarea'), {
      target: { value: 'Cho tam giác ABC.' },
    });
    fireEvent.click(screen.getByTestId('geometry-ai-submit'));
    await waitFor(() => expect((gen as jest.Mock).mock.calls.length).toBe(1));
    expect(screen.queryByTestId('geometry-ai-partial-notice')).toBeNull();
  });
});
