import { buildGraph2DSeed, parseFunctionInput } from '../fromExpression';
import { parseSceneState } from '../serialize';
import { compile } from '../../../core/scene/expressions/parser';
import { isGraph2DCustomData } from '../types';

/** Giá trị hàm đã chuẩn hoá tại x (tham số = 1, như giá trị gieo của slider). */
function valueAt(input: string, x: number): number {
  const parsed = parseFunctionInput(input);
  if (!parsed) throw new Error(`không nhận dạng được: ${input}`);
  const params = Object.fromEntries(parsed.params.map((p) => [p, 1]));
  const fn = compile(parsed.expression, params);
  if (typeof fn !== 'function') throw new Error(`không compile được: ${parsed.expression}`);
  return fn(x);
}

describe('parseFunctionInput — nhận dạng hàm GV gõ trong ô tìm công cụ', () => {
  // Không chỉ so chuỗi: so GIÁ TRỊ tại vài điểm — chuẩn hoá sai (vd chèn nhân
  // nhầm chỗ) vẫn có thể ra chuỗi hợp lệ cú pháp nhưng sai toán.
  it.each([
    ['y = x^2 - 2x + 1', 3, 4],
    ['f(x) = (x-1)(x+2)', 3, 10],
    ['y=2(x+1)', 2, 6],
    ['x(x-1)', 4, 12],
    ['y = x²', -3, 9],
    ['y = √x', 9, 3],
    ['y = √(x+7)', 2, 3],
    ['y = 2x − 1', 5, 9], // dấu trừ U+2212 kiểu bàn phím toán
    ['y = 3 × x', 2, 6],
    ['y = 1.5x', 2, 3],
    ['y = x/2', 8, 4],
    ['Y = X', 7, NaN], // X hoa không phải biến — xem ca từ chối bên dưới
  ].filter(([, , v]) => !Number.isNaN(v)))('%s  →  f(%d) = %d', (input, x, expected) => {
    expect(valueAt(input as string, x as number)).toBeCloseTo(expected as number);
  });

  it.each([
    ['sinx', Math.PI / 2, 1],
    ['y = sin x', Math.PI / 2, 1],
    ['y = sin2x', Math.PI / 4, 1],
    ['y = 2sin(x)', Math.PI / 2, 2],
    ['y = cos(x)', 0, 1],
    ['y = log10x', 100, 2], // log10 phải thắng log (thứ tự alternation)
    ['y = sqrt(x)', 16, 4],
    ['y = abs(x - 3)', 1, 2],
    ['y = 2pi', 0, 2 * Math.PI],
    ['y = πx', 1, Math.PI],
    ['y = 2π', 0, 2 * Math.PI],
    ['y = ln(x)', Math.E, 1], // trước đây parser ném TypeError
    ['y = log(x)', 100, 2], // log không ghi cơ số = cơ số 10
    // Chữ số NẰM TRONG tên hàm không được coi là "số liền chữ": bản đầu
    // biến atan2( / log10( thành atan2*( / log10*(.
    ['y = atan2(x, 1)', 1, Math.PI / 4],
    ['y = 2^x', 3, 8],
    ['y = 3x(x-1)', 2, 6],
  ])('hàm có sẵn: %s  →  f(%d) = %d', (input, x, expected) => {
    expect(valueAt(input, x)).toBeCloseTo(expected);
  });

  it('biểu thức đã chuẩn hoá giữ nguyên tên hàm có chữ số', () => {
    expect(parseFunctionInput('y = log10(x)')?.expression).toBe('log10(x)');
    expect(parseFunctionInput('y = atan2(x,1)')?.expression).toBe('atan2(x,1)');
  });

  it('tham số 1 chữ cái → tách nhân + trả về để gieo thanh trượt', () => {
    expect(parseFunctionInput('y = mx + 1')).toEqual({ expression: 'm*x+1', params: ['m'] });
    expect(parseFunctionInput('y = ax^2 + bx + c')).toEqual({
      expression: 'a*x^2+b*x+c',
      params: ['a', 'b', 'c'],
    });
  });

  it('có tiền tố "y =" thì nhận cả hàm hằng', () => {
    expect(parseFunctionInput('y = 3')).toEqual({ expression: '3', params: [] });
  });

  it.each([
    [''],
    ['   '],
    ['3'], // không tiền tố, không x ⇒ chỉ là con số
    ['text'], // "ex" nằm giữa từ — không được tách thành t*e*x
    ['max'],
    ['sin'],
    ['điểm'],
    ['trung điểm'],
    ['trục x'],
    ['đường tròn'],
    ['abc'], // tham số nhiều chữ cái ⇒ chữ tìm kiếm, không phải công thức
    ['x + y = 1'], // phương trình, không phải dạng y = f(x)
    ['y = x + y'],
    ['x2'], // không đoán x2 là x*2
    ['y = x +'], // cú pháp lỗi
    ['y = foo(x)'], // hàm không có trong danh sách cho phép
    ['X'], // chữ hoa không phải biến x
  ])('không nhận nhầm: %j', (input) => {
    expect(parseFunctionInput(input)).toBeNull();
  });
});

describe('buildGraph2DSeed — dữ liệu gieo cho editor đồ thị', () => {
  it('customData hợp lệ, state parse lại được, có đúng một hàm f1', () => {
    const seed = buildGraph2DSeed({ expression: 'x^2-2*x', params: [] });

    expect(isGraph2DCustomData(seed)).toBe(true);
    const state = parseSceneState(seed.jsonState);
    expect(state).not.toBeNull();
    const fns = Object.values(state!.objects).filter((o) => o.kind === 'function2d');
    expect(fns).toHaveLength(1);
    expect(fns[0]).toMatchObject({ id: 'f1', label: 'f1', attrs: { expression: 'x^2-2*x' } });
  });

  it('mỗi tham số thành một thanh trượt, đứng TRƯỚC hàm dùng nó', () => {
    const seed = buildGraph2DSeed({ expression: 'm*x+k', params: ['k', 'm'] });
    const state = parseSceneState(seed.jsonState)!;

    expect(state.order).toEqual(['k', 'm', 'f1']);
    expect(state.objects.m).toMatchObject({
      kind: 'parameter',
      attrs: { value: 1, min: -5, max: 5, step: 0.1 },
    });
  });

  it('biểu thức không hợp lệ ⇒ ném lỗi ngay (reducer validate), không gieo rác', () => {
    expect(() => buildGraph2DSeed({ expression: 'x +', params: [] })).toThrow();
  });
});
