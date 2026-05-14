export type MathStampCustomData =
  | {
      kind: 'geometry';
      version: 1;
      jsonState: string;
      svgWidth: number;
      svgHeight: number;
    }
  | {
      kind: 'latex';
      version: 1;
      src: string;
      displayMode: boolean;
    };

export function isMathStamp<T extends { customData?: unknown }>(
  element: T,
): element is T & { customData: MathStampCustomData } {
  const c = element.customData as { kind?: unknown; version?: unknown } | undefined;
  if (!c) return false;
  if (c.version !== 1) return false;
  return c.kind === 'geometry' || c.kind === 'latex';
}
