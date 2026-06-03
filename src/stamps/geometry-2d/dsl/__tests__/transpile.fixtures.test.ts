// src/stamps/geometry-2d/dsl/__tests__/transpile.fixtures.test.ts
import { transpile } from '../transpile';

import { fixture as equilateral } from '../fixtures/triangle-equilateral';
import { fixture as median } from '../fixtures/triangle-median';
import { fixture as altitude } from '../fixtures/triangle-altitude';
import { fixture as centroid } from '../fixtures/triangle-centroid';
import { fixture as orthocenter } from '../fixtures/triangle-orthocenter';
import { fixture as circumcircle } from '../fixtures/triangle-circumcircle';
import { fixture as incircle } from '../fixtures/triangle-incircle';
import { fixture as parallelogram } from '../fixtures/parallelogram';
import { fixture as twoCirclesIntersect } from '../fixtures/two-circles-intersect';
import { fixture as angleBisector } from '../fixtures/triangle-angle-bisector';

const ALL = [
  ['triangle-equilateral', equilateral, 4],
  ['triangle-median', median, 6],
  ['triangle-altitude', altitude, 7],
  ['triangle-centroid', centroid, 5],
  ['triangle-orthocenter', orthocenter, 5],
  ['triangle-circumcircle', circumcircle, 6],
  ['triangle-incircle', incircle, 8],
  ['triangle-angle-bisector', angleBisector, 8],
  ['parallelogram', parallelogram, 8],
  ['two-circles-intersect', twoCirclesIntersect, 8],
] as const;

describe('fixture transpile happy paths', () => {
  it.each(ALL)('%s transpiles OK (expected %i objects)', (_name, fix, expectedCount) => {
    const r = transpile(fix.dsl);
    if (!r.ok) {
      throw new Error('transpile failed: ' + JSON.stringify(r.errors));
    }
    expect(Object.keys(r.state.objects)).toHaveLength(expectedCount);
    expect(r.state.order).toHaveLength(expectedCount);
    expect(r.state.counter).toBe(expectedCount);
    // All ids are valid prefix-counter strings
    for (const id of r.state.order) {
      expect(id).toMatch(/^(p|i|s|l|r|poly|c)\d+$/);
    }
  });
});

describe('representative snapshot', () => {
  it('triangle-equilateral state matches inline snapshot', () => {
    const r = transpile(equilateral.dsl);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state).toMatchInlineSnapshot(`
{
  "counter": 4,
  "meta": {
    "domain": "2d",
    "version": 1,
    "view": {
      "bbox": [
        -10,
        10,
        10,
        -10,
      ],
      "showAxis": false,
      "showGrid": false,
    },
  },
  "objects": {
    "p1": {
      "attrs": {
        "constraint": {
          "kind": "free",
          "x": 0,
          "y": 0,
        },
      },
      "id": "p1",
      "kind": "point",
      "label": "A",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
    "p2": {
      "attrs": {
        "constraint": {
          "kind": "free",
          "x": 4,
          "y": 0,
        },
      },
      "id": "p2",
      "kind": "point",
      "label": "B",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
    "p3": {
      "attrs": {
        "constraint": {
          "kind": "free",
          "x": 2,
          "y": 3.464,
        },
      },
      "id": "p3",
      "kind": "point",
      "label": "C",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
    "poly1": {
      "attrs": {
        "vertices": [
          "p1",
          "p2",
          "p3",
        ],
      },
      "id": "poly1",
      "kind": "polygon",
      "label": "ABC",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
  },
  "order": [
    "p1",
    "p2",
    "p3",
    "poly1",
  ],
}
`);
  });

  it('parallelogram state matches inline snapshot', () => {
    const r = transpile(parallelogram.dsl);
    if (!r.ok) throw new Error('expected ok');
    expect(r.state).toMatchInlineSnapshot(`
{
  "counter": 8,
  "meta": {
    "domain": "2d",
    "version": 1,
    "view": {
      "bbox": [
        -10,
        10,
        10,
        -10,
      ],
      "showAxis": false,
      "showGrid": false,
    },
  },
  "objects": {
    "i1": {
      "attrs": {
        "kind": "lineLine",
        "ref1": "s1",
        "ref2": "s2",
      },
      "id": "i1",
      "kind": "intersection",
      "label": "O",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
    "p1": {
      "attrs": {
        "constraint": {
          "kind": "free",
          "x": 0,
          "y": 0,
        },
      },
      "id": "p1",
      "kind": "point",
      "label": "A",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
    "p2": {
      "attrs": {
        "constraint": {
          "kind": "free",
          "x": 4,
          "y": 0,
        },
      },
      "id": "p2",
      "kind": "point",
      "label": "B",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
    "p3": {
      "attrs": {
        "constraint": {
          "kind": "free",
          "x": 5,
          "y": 2,
        },
      },
      "id": "p3",
      "kind": "point",
      "label": "C",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
    "p4": {
      "attrs": {
        "constraint": {
          "kind": "free",
          "x": 1,
          "y": 2,
        },
      },
      "id": "p4",
      "kind": "point",
      "label": "D",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
    "poly1": {
      "attrs": {
        "vertices": [
          "p1",
          "p2",
          "p3",
          "p4",
        ],
      },
      "id": "poly1",
      "kind": "polygon",
      "label": "ABCD",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
    "s1": {
      "attrs": {
        "p1": "p1",
        "p2": "p3",
      },
      "id": "s1",
      "kind": "segment",
      "label": "AC",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
    "s2": {
      "attrs": {
        "p1": "p2",
        "p2": "p4",
      },
      "id": "s2",
      "kind": "segment",
      "label": "BD",
      "layer": "default",
      "locked": false,
      "schemaVersion": 1,
      "visible": true,
    },
  },
  "order": [
    "p1",
    "p2",
    "p3",
    "p4",
    "poly1",
    "s1",
    "s2",
    "i1",
  ],
}
`);
  });
});
