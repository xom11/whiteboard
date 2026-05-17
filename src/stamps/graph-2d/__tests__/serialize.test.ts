import {
  EMPTY_GRAPH,
  parseSerializedGraph,
  stringifySerializedGraph,
  type SerializedGraph,
} from '../serialize';

describe('serialize.EMPTY_GRAPH', () => {
  it('có view mặc định [-10, 10] x [-10, 10] với axis+grid', () => {
    expect(EMPTY_GRAPH.version).toBe(1);
    expect(EMPTY_GRAPH.view.xMin).toBe(-10);
    expect(EMPTY_GRAPH.view.xMax).toBe(10);
    expect(EMPTY_GRAPH.view.yMin).toBe(-10);
    expect(EMPTY_GRAPH.view.yMax).toBe(10);
    expect(EMPTY_GRAPH.view.showAxis).toBe(true);
    expect(EMPTY_GRAPH.view.showGrid).toBe(true);
    expect(EMPTY_GRAPH.functions).toEqual([]);
    expect(EMPTY_GRAPH.parameters).toEqual([]);
  });
});

describe('serialize round-trip', () => {
  it('stringify → parse trả về data tương đương', () => {
    const original: SerializedGraph = {
      ...EMPTY_GRAPH,
      functions: [
        { id: 'f1', name: 'f', expression: 'x^2', color: '#2563eb', visible: true },
      ],
      parameters: [{ name: 'a', value: 1, min: -5, max: 5, step: 0.1 }],
    };
    const s = stringifySerializedGraph(original);
    const parsed = parseSerializedGraph(s);
    expect(parsed).toEqual(original);
  });
});

describe('parseSerializedGraph error handling', () => {
  it('JSON corrupt trả null', () => {
    expect(parseSerializedGraph('{not json')).toBeNull();
  });

  it('version mismatch trả null', () => {
    const bad = JSON.stringify({ ...EMPTY_GRAPH, version: 99 });
    expect(parseSerializedGraph(bad)).toBeNull();
  });

  it('thiếu view trả null', () => {
    const bad = JSON.stringify({ version: 1, functions: [] });
    expect(parseSerializedGraph(bad)).toBeNull();
  });

  it('thiếu array fields trả null', () => {
    const bad = JSON.stringify({ version: 1, view: EMPTY_GRAPH.view });
    expect(parseSerializedGraph(bad)).toBeNull();
  });

  it('input không phải object trả null', () => {
    expect(parseSerializedGraph('null')).toBeNull();
    expect(parseSerializedGraph('"string"')).toBeNull();
    expect(parseSerializedGraph('123')).toBeNull();
  });
});
