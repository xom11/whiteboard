import { B as BaseStampCustomData, S as StampType } from './types-CinstD7T.mjs';
import 'react';
import '@excalidraw/excalidraw/element/types';

interface Geometry3DCustomData extends BaseStampCustomData {
    kind: 'geometry3d';
    version: 1 | 2;
    jsonState: string;
    svgWidth: number;
    svgHeight: number;
}
declare function isGeometry3DCustomData(data: unknown): data is Geometry3DCustomData;

declare const geometry3dStamp: StampType;

export { type Geometry3DCustomData, geometry3dStamp, isGeometry3DCustomData };
