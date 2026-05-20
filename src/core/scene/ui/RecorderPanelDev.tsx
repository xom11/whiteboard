'use client';
import * as React from 'react';
import { RecorderPanel, type RecorderPanelProps } from './RecorderPanel';

export interface RecorderPanelDevProps extends RecorderPanelProps {
  /** Bypass dev-only check (for tests / explicit user). */
  force?: boolean;
}

export function RecorderPanelDev(props: RecorderPanelDevProps): React.ReactElement | null {
  const { force, ...rest } = props;
  const isDev = force || process.env.NODE_ENV === 'development';
  if (!isDev) return null;
  return <RecorderPanel {...rest} />;
}
