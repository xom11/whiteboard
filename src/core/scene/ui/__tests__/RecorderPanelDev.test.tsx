import * as React from 'react';
import { render } from '@testing-library/react';
import { RecorderPanelDev } from '../RecorderPanelDev';
import type { ActionRecorder, RecordedAction } from '../useActionRecorder';

function makeRecorder(): ActionRecorder {
  return {
    history: [] as ReadonlyArray<RecordedAction>,
    isRecording: true,
    isReplaying: false,
    record: jest.fn(),
    stop: jest.fn(),
    clear: jest.fn(),
    replay: jest.fn().mockResolvedValue(undefined),
  };
}

describe('RecorderPanelDev', () => {
  const ORIG_ENV = process.env.NODE_ENV;
  afterEach(() => { (process.env as { NODE_ENV?: string }).NODE_ENV = ORIG_ENV; });

  it('renders panel in development mode', () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';
    const { queryByLabelText } = render(<RecorderPanelDev recorder={makeRecorder()} />);
    expect(queryByLabelText('Toggle recorder')).not.toBeNull();
  });

  it('renders null in production mode', () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';
    const { queryByLabelText } = render(<RecorderPanelDev recorder={makeRecorder()} />);
    expect(queryByLabelText('Toggle recorder')).toBeNull();
  });

  it('renders in production if force prop is true', () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';
    const { queryByLabelText } = render(<RecorderPanelDev recorder={makeRecorder()} force />);
    expect(queryByLabelText('Toggle recorder')).not.toBeNull();
  });
});
