import { normalizeIntents } from '../normalizeIntent';
import type { IntentT } from '../intent';

describe('normalizeIntents — triangle isoceles label position', () => {
  const tri = (labels: [string, string, string], variant: string): IntentT => ({
    op: 'draw-shape',
    shape: 'triangle',
    labels,
    variant: variant as never,
  });

  it('"cân tại A" (apex pos 0) → isoceles-BC bất kể LLM emit gì', () => {
    const out = normalizeIntents(
      [tri(['A', 'B', 'C'], 'isoceles-AB')],
      'Tam giác ABC cân tại A.',
    );
    expect((out[0] as { variant: string }).variant).toBe('isoceles-BC');
  });

  it('"cân tại N" (apex pos 1 trong MNP) → isoceles-CA', () => {
    const out = normalizeIntents(
      [tri(['M', 'N', 'P'], 'isoceles-AB')],
      'Tam giác MNP cân tại N.',
    );
    expect((out[0] as { variant: string }).variant).toBe('isoceles-CA');
  });

  it('"cân tại P" (apex pos 2 trong MNP) → isoceles-AB', () => {
    const out = normalizeIntents(
      [tri(['M', 'N', 'P'], 'isoceles-BC')],
      'Tam giác MNP cân tại P.',
    );
    expect((out[0] as { variant: string }).variant).toBe('isoceles-AB');
  });

  it('không có "cân tại" → giữ nguyên variant LLM emit', () => {
    const out = normalizeIntents(
      [tri(['A', 'B', 'C'], 'equilateral')],
      'Tam giác đều ABC.',
    );
    expect((out[0] as { variant: string }).variant).toBe('equilateral');
  });
});

describe('normalizeIntents — quad shapes default to standard', () => {
  const quad = (
    shape: 'rectangle' | 'square' | 'rhombus' | 'parallelogram',
    variant: string,
  ): IntentT => ({
    op: 'draw-shape',
    shape,
    labels: ['A', 'B', 'C', 'D'],
    variant: variant as never,
  });

  it('rectangle "wide"/"tall" → "standard" khi đề không nói "cao"/"hẹp"', () => {
    const out = normalizeIntents([quad('rectangle', 'wide')], 'Hình chữ nhật ABCD.');
    expect((out[0] as { variant: string }).variant).toBe('standard');

    const out2 = normalizeIntents([quad('rectangle', 'tall')], 'Hình chữ nhật ABCD.');
    expect((out2[0] as { variant: string }).variant).toBe('standard');
  });

  it('rectangle giữ "tall" khi đề có "cao"', () => {
    const out = normalizeIntents([quad('rectangle', 'tall')], 'Hình chữ nhật cao ABCD.');
    expect((out[0] as { variant: string }).variant).toBe('tall');
  });

  it('square emit "any" → ép "standard"', () => {
    const out = normalizeIntents([quad('square', 'any')], 'Hình vuông ABCD.');
    expect((out[0] as { variant: string }).variant).toBe('standard');
  });

  it('rhombus emit lung tung → ép "standard"', () => {
    const out = normalizeIntents([quad('rhombus', 'isoceles')], 'Hình thoi ABCD.');
    expect((out[0] as { variant: string }).variant).toBe('standard');
  });

  it('parallelogram emit lung tung → ép "standard"', () => {
    const out = normalizeIntents([quad('parallelogram', 'any')], 'Hình bình hành ABCD.');
    expect((out[0] as { variant: string }).variant).toBe('standard');
  });
});

describe('normalizeIntents — tangent line field confusion', () => {
  it('tangentAt với `from` (nhầm field) → remap thành `through`', () => {
    const intent: IntentT = {
      op: 'draw-line',
      name: 'tC',
      kind: 'tangentAt',
      from: 'C',
      circle: 'O',
    };
    const out = normalizeIntents([intent], 'Tiếp tuyến tại C của (O).');
    expect(out[0]).toEqual({
      op: 'draw-line',
      name: 'tC',
      kind: 'tangentAt',
      through: 'C',
      circle: 'O',
    });
  });

  it('tangentAt với `through` đúng → giữ nguyên', () => {
    const intent: IntentT = {
      op: 'draw-line',
      name: 'tC',
      kind: 'tangentAt',
      through: 'C',
      circle: 'O',
    };
    const out = normalizeIntents([intent], 'x');
    expect(out[0]).toEqual(intent);
  });

  it('tangentFromExt với `through` (nhầm field) → remap thành `from`', () => {
    const intent: IntentT = {
      op: 'draw-line',
      name: 'AP',
      kind: 'tangentFromExt',
      through: 'A',
      circle: 'O',
    };
    const out = normalizeIntents([intent], 'Từ A kẻ tiếp tuyến tới (O).');
    expect(out[0]).toEqual({
      op: 'draw-line',
      name: 'AP',
      kind: 'tangentFromExt',
      from: 'A',
      circle: 'O',
    });
  });

  it('perpThrough/parallelThrough không bị đụng', () => {
    const intent: IntentT = {
      op: 'draw-line',
      name: 'd',
      kind: 'perpThrough',
      through: 'A',
      to: 'BC',
    };
    const out = normalizeIntents([intent], 'x');
    expect(out[0]).toEqual(intent);
  });
});
