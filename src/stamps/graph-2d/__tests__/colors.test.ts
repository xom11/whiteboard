import {
  GRAPH_PALETTE,
  FUNCTION_NAMES,
  MAX_FUNCTIONS,
  MAX_PARAMETERS,
  nextColor,
  nextFunctionName,
} from '../colors';

describe('graph-2d colors', () => {
  it('palette có đúng 8 màu unique', () => {
    expect(GRAPH_PALETTE).toHaveLength(8);
    expect(new Set(GRAPH_PALETTE).size).toBe(8);
  });

  it('FUNCTION_NAMES có 8 ký tự đơn theo alphabet', () => {
    expect(FUNCTION_NAMES).toEqual(['f', 'g', 'h', 'i', 'j', 'k', 'l', 'm']);
  });

  it('MAX_FUNCTIONS = 8', () => {
    expect(MAX_FUNCTIONS).toBe(8);
  });

  it('MAX_PARAMETERS = 8', () => {
    expect(MAX_PARAMETERS).toBe(8);
  });

  it('nextColor trả màu chưa dùng', () => {
    expect(nextColor([])).toBe(GRAPH_PALETTE[0]);
    expect(nextColor([GRAPH_PALETTE[0]])).toBe(GRAPH_PALETTE[1]);
    expect(nextColor([GRAPH_PALETTE[0], GRAPH_PALETTE[1]])).toBe(GRAPH_PALETTE[2]);
  });

  it('nextColor cycle khi đã dùng hết palette', () => {
    expect(nextColor(GRAPH_PALETTE.slice())).toBe(GRAPH_PALETTE[0]);
  });

  it('nextFunctionName trả tên chưa dùng', () => {
    expect(nextFunctionName([])).toBe('f');
    expect(nextFunctionName(['f'])).toBe('g');
    expect(nextFunctionName(['f', 'g'])).toBe('h');
  });
});
