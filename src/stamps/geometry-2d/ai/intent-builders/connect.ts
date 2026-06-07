// src/stamps/geometry-2d/ai/intent-builders/connect.ts
//
// op: connect — move verbatim từ intentToDsl.ts handleConnect (Phase 2b, #45).

import type { IntentBuilder } from './_types';
import { IntentBuilderError } from './_types';
import { ensureSegment, addShape, uniqueShapeName } from './shared';
import type { ConnectIntentT } from '../intent';

export const buildConnect: IntentBuilder<ConnectIntentT> = (s, intent) => {
  const { from, to, style } = intent;
  switch (style) {
    case 'segment':
      ensureSegment(s, from, to);
      break;
    case 'line':
      addShape(s, { name: uniqueShapeName(s, `l_${from}${to}`), kind: 'line', p1: from, p2: to });
      break;
    case 'ray':
      addShape(s, { name: uniqueShapeName(s, `r_${from}${to}`), kind: 'ray', origin: from, through: to });
      break;
    case 'perpBisector':
      addShape(s, { name: uniqueShapeName(s, `pb_${from}${to}`), kind: 'perpBisector', p1: from, p2: to });
      break;
    case 'angleBisector':
      // angleBisector cần 3 điểm (p1, vertex, p2). connect chỉ có 2 điểm → bỏ qua,
      // caller nên dùng intent.add-point với incenter/internalBisector.
      throw new IntentBuilderError(
        'connect.style=angleBisector cần 3 điểm; dùng add-point/incenter thay',
        intent,
      );
  }
};
