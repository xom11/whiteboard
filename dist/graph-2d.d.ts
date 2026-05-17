import { B as BaseStampCustomData, S as StampType } from './types-CinstD7T.js';
import 'react';
import '@excalidraw/excalidraw/element/types';

interface Graph2DCustomData extends BaseStampCustomData {
    kind: 'graph2d';
    version: 1;
    jsonState: string;
    svgWidth: number;
    svgHeight: number;
}
declare function isGraph2DCustomData(data: unknown): data is Graph2DCustomData;

declare const graph2dStamp: StampType;

export { type Graph2DCustomData, graph2dStamp, isGraph2DCustomData };
