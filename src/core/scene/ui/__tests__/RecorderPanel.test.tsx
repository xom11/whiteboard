import * as React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { RecorderPanel } from '../RecorderPanel';
import type { ActionRecorder, RecordedAction } from '../useActionRecorder';

function makeRecorder(over: Partial<ActionRecorder> = {}): ActionRecorder {
  return {
    history: [] as ReadonlyArray<RecordedAction>,
    isRecording: true,
    isReplaying: false,
    record: jest.fn(),
    stop: jest.fn(),
    clear: jest.fn(),
    replay: jest.fn().mockResolvedValue(undefined),
    ...over,
  };
}

describe('RecorderPanel', () => {
  it('renders count badge', () => {
    const rec = makeRecorder({ history: [
      { action: { type: 'RESET' }, at: 1 },
      { action: { type: 'RESET' }, at: 2 },
    ] });
    render(<RecorderPanel recorder={rec} defaultOpen />);
    expect(screen.getByTestId('recorder-count')).toHaveTextContent('2');
  });

  it('clicking Replay calls recorder.replay', () => {
    const rec = makeRecorder({ history: [{ action: { type: 'RESET' }, at: 1 }] });
    render(<RecorderPanel recorder={rec} defaultOpen />);
    fireEvent.click(screen.getByLabelText('Replay'));
    expect(rec.replay).toHaveBeenCalled();
  });

  it('clicking Clear calls recorder.clear', () => {
    const rec = makeRecorder({ history: [{ action: { type: 'RESET' }, at: 1 }] });
    render(<RecorderPanel recorder={rec} defaultOpen />);
    fireEvent.click(screen.getByLabelText('Clear history'));
    expect(rec.clear).toHaveBeenCalled();
  });

  it('clicking Stop calls recorder.stop, Record calls recorder.record', () => {
    const rec = makeRecorder();
    render(<RecorderPanel recorder={rec} defaultOpen />);
    fireEvent.click(screen.getByLabelText('Stop recording'));
    expect(rec.stop).toHaveBeenCalled();
  });

  it('renders history list items', () => {
    const rec = makeRecorder({
      history: [
        { action: { type: 'ADD', payload: { obj: { id: 'x', kind: 'point' } as never } }, at: 1 },
        { action: { type: 'DELETE', payload: { id: 'x' } }, at: 2 },
      ],
    });
    render(<RecorderPanel recorder={rec} defaultOpen />);
    expect(screen.getByText(/ADD/)).toBeInTheDocument();
    expect(screen.getByText(/DELETE/)).toBeInTheDocument();
  });

  it('shows replaying state', () => {
    const rec = makeRecorder({ isReplaying: true });
    render(<RecorderPanel recorder={rec} defaultOpen />);
    expect(screen.getByLabelText('Replay')).toBeDisabled();
  });

  it('collapsed by default', () => {
    const rec = makeRecorder();
    render(<RecorderPanel recorder={rec} />);
    expect(screen.queryByTestId('recorder-body')).toBeNull();
  });

  it('toggle button expands', () => {
    const rec = makeRecorder();
    render(<RecorderPanel recorder={rec} />);
    fireEvent.click(screen.getByLabelText('Toggle recorder'));
    expect(screen.getByTestId('recorder-body')).toBeInTheDocument();
  });
});
