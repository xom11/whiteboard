import { B as BaseStampCustomData, S as StampType } from './types-CinstD7T.js';
import 'react';
import '@excalidraw/excalidraw/element/types';

interface GeometryCustomData extends BaseStampCustomData {
    kind: 'geometry';
    version: 1;
    jsonState: string;
    svgWidth: number;
    svgHeight: number;
}
declare function isGeometryCustomData(data: unknown): data is GeometryCustomData;

declare const geometryStamp: StampType;

export { type GeometryCustomData, geometryStamp, isGeometryCustomData };
