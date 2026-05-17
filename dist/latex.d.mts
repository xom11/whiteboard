import { B as BaseStampCustomData, S as StampType } from './types-CinstD7T.mjs';
import 'react';
import '@excalidraw/excalidraw/element/types';

interface LatexCustomData extends BaseStampCustomData {
    kind: 'latex';
    version: 1;
    src: string;
    displayMode: boolean;
}
declare function isLatexCustomData(data: unknown): data is LatexCustomData;

declare const latexStamp: StampType;

export { type LatexCustomData, isLatexCustomData, latexStamp };
