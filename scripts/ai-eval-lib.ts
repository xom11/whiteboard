import type { GenerateResult, TokenUsage } from '../src/stamps/geometry-2d/ai';

export interface EvalCase {
  readonly id: string;
  readonly category: string;
  readonly problem: string;
  readonly requiredLabels: readonly string[];
  readonly requiredKinds: readonly string[];
}

export interface EvalOutcome {
  readonly evalCase: EvalCase;
  readonly passed: boolean;
  readonly missingLabels: string[];
  readonly missingKinds: string[];
  readonly error?: string;
  readonly usage?: TokenUsage;
}

export const EVAL_CASES: ReadonlyArray<EvalCase> = [
  {
    id: 'triangle-basic',
    category: 'triangle',
    problem: 'Cho tam giác ABC có ba đỉnh không thẳng hàng. Hãy dựng tam giác ABC.',
    requiredLabels: ['A', 'B', 'C'],
    requiredKinds: ['point', 'polygon'],
  },
  {
    id: 'triangle-midpoint',
    category: 'triangle',
    problem: 'Cho tam giác ABC. Gọi M là trung điểm của cạnh BC. Dựng hình theo đề bài.',
    requiredLabels: ['A', 'B', 'C', 'M'],
    requiredKinds: ['polygon', 'point'],
  },
  {
    id: 'triangle-median',
    category: 'cevian',
    problem: 'Cho tam giác ABC, M là trung điểm BC. Vẽ trung tuyến AM.',
    requiredLabels: ['A', 'B', 'C', 'M', 'AM'],
    requiredKinds: ['polygon', 'segment'],
  },
  {
    id: 'triangle-altitude',
    category: 'cevian',
    problem: 'Cho tam giác ABC. Gọi H là chân đường cao kẻ từ A xuống BC. Vẽ AH.',
    requiredLabels: ['A', 'B', 'C', 'H', 'AH'],
    requiredKinds: ['polygon', 'point', 'segment'],
  },
  {
    id: 'triangle-centroid',
    category: 'centers',
    problem: 'Cho tam giác ABC. Dựng trọng tâm G của tam giác.',
    requiredLabels: ['A', 'B', 'C', 'G'],
    requiredKinds: ['polygon', 'point'],
  },
  {
    id: 'triangle-orthocenter',
    category: 'centers',
    problem: 'Cho tam giác ABC. Dựng trực tâm H của tam giác.',
    requiredLabels: ['A', 'B', 'C', 'H'],
    requiredKinds: ['polygon', 'point'],
  },
  {
    id: 'triangle-circumcircle',
    category: 'circles',
    problem: 'Cho tam giác ABC. Dựng đường tròn ngoại tiếp tam giác, tâm O.',
    requiredLabels: ['A', 'B', 'C', 'O'],
    requiredKinds: ['polygon', 'circle'],
  },
  {
    id: 'triangle-incircle',
    category: 'circles',
    problem: 'Cho tam giác ABC. Dựng tâm nội tiếp I và đường tròn nội tiếp tam giác.',
    requiredLabels: ['A', 'B', 'C', 'I'],
    requiredKinds: ['polygon', 'circle'],
  },
  {
    id: 'perp-bisector',
    category: 'lines',
    problem: 'Cho đoạn thẳng AB. Dựng đường trung trực d của đoạn AB.',
    requiredLabels: ['A', 'B', 'd'],
    requiredKinds: ['segment', 'line'],
  },
  {
    id: 'angle-bisector',
    category: 'lines',
    problem: 'Cho góc xAy xác định bởi ba điểm B, A, C. Dựng tia phân giác d của góc BAC.',
    requiredLabels: ['A', 'B', 'C', 'd'],
    requiredKinds: ['line'],
  },
  {
    id: 'circle-center-point',
    category: 'circles',
    problem: 'Cho tâm O và điểm A. Dựng đường tròn (O) đi qua A.',
    requiredLabels: ['O', 'A'],
    requiredKinds: ['point', 'circle'],
  },
  {
    id: 'circle-tangent',
    category: 'circles',
    problem: 'Cho đường tròn (O) và điểm T nằm trên đường tròn. Dựng tiếp tuyến d tại T.',
    requiredLabels: ['O', 'T', 'd'],
    requiredKinds: ['circle', 'line'],
  },
  {
    id: 'two-circles-intersections',
    category: 'intersections',
    problem: 'Cho hai đường tròn (O) và (I) cắt nhau tại M và N. Dựng hình.',
    requiredLabels: ['O', 'I', 'M', 'N'],
    requiredKinds: ['circle', 'intersection'],
  },
  {
    id: 'line-circle-intersection',
    category: 'intersections',
    problem: 'Cho đường tròn (O) và đường thẳng d cắt đường tròn tại A và B. Dựng hình.',
    requiredLabels: ['O', 'd', 'A', 'B'],
    requiredKinds: ['circle', 'line', 'intersection'],
  },
  {
    id: 'parallelogram',
    category: 'quadrilaterals',
    problem: 'Cho hình bình hành ABCD. Dựng hình và hai đường chéo AC, BD.',
    requiredLabels: ['A', 'B', 'C', 'D', 'AC', 'BD'],
    requiredKinds: ['polygon', 'segment'],
  },
  {
    id: 'rectangle',
    category: 'quadrilaterals',
    problem: 'Dựng hình chữ nhật ABCD và đường chéo AC.',
    requiredLabels: ['A', 'B', 'C', 'D', 'AC'],
    requiredKinds: ['polygon', 'segment'],
  },
  {
    id: 'rhombus',
    category: 'quadrilaterals',
    problem: 'Dựng hình thoi ABCD với hai đường chéo AC và BD.',
    requiredLabels: ['A', 'B', 'C', 'D', 'AC', 'BD'],
    requiredKinds: ['polygon', 'segment'],
  },
  {
    id: 'trapezoid',
    category: 'quadrilaterals',
    problem: 'Dựng hình thang ABCD có AB song song với CD.',
    requiredLabels: ['A', 'B', 'C', 'D'],
    requiredKinds: ['polygon'],
  },
  {
    id: 'diagonal-intersection',
    category: 'intersections',
    problem: 'Cho tứ giác ABCD. Hai đường chéo AC và BD cắt nhau tại O. Dựng hình.',
    requiredLabels: ['A', 'B', 'C', 'D', 'AC', 'BD', 'O'],
    requiredKinds: ['polygon', 'segment', 'intersection'],
  },
  {
    id: 'triangle-midsegment',
    category: 'cevian',
    problem: 'Cho tam giác ABC. M, N lần lượt là trung điểm AB và AC. Dựng đoạn trung bình MN.',
    requiredLabels: ['A', 'B', 'C', 'M', 'N', 'MN'],
    requiredKinds: ['polygon', 'segment'],
  },
  {
    id: 'diameter-circle',
    category: 'circles',
    problem: 'Cho đoạn thẳng AB. Dựng đường tròn tâm O có AB là đường kính.',
    requiredLabels: ['A', 'B', 'O'],
    requiredKinds: ['segment', 'circle'],
  },
  {
    id: 'parallel-through-point',
    category: 'lines',
    problem: 'Cho đường thẳng AB và điểm C nằm ngoài đường thẳng. Dựng đường thẳng d qua C song song AB.',
    requiredLabels: ['A', 'B', 'C', 'd'],
    requiredKinds: ['line'],
  },
  {
    id: 'perpendicular-through-point',
    category: 'lines',
    problem: 'Cho đường thẳng AB và điểm C. Dựng đường thẳng d qua C vuông góc AB.',
    requiredLabels: ['A', 'B', 'C', 'd'],
    requiredKinds: ['line'],
  },
  {
    id: 'ray-and-circle',
    category: 'intersections',
    problem: 'Cho tia Ox và đường tròn tâm O cắt tia tại A. Dựng tia và đường tròn.',
    requiredLabels: ['O', 'A'],
    requiredKinds: ['ray', 'circle'],
  },
];

function usageFrom(result: GenerateResult): TokenUsage | undefined {
  if (result.ok) return result.usage;
  return 'usage' in result ? result.usage : undefined;
}

export function evaluateResult(evalCase: EvalCase, result: GenerateResult): EvalOutcome {
  const usage = usageFrom(result);
  if (!result.ok) {
    return {
      evalCase,
      passed: false,
      missingLabels: [],
      missingKinds: [],
      error: `${result.reason}: ${result.message}`,
      ...(usage ? { usage } : {}),
    };
  }

  const objects = Object.values(result.state.objects);
  const labels = new Set(objects.map((obj) => obj.label));
  const kinds = new Set(objects.map((obj) => obj.kind));
  const missingLabels = evalCase.requiredLabels.filter((label) => !labels.has(label));
  const missingKinds = evalCase.requiredKinds.filter((kind) => !kinds.has(kind));

  return {
    evalCase,
    passed: missingLabels.length === 0 && missingKinds.length === 0,
    missingLabels,
    missingKinds,
    usage,
  };
}

export function sumUsage(outcomes: readonly EvalOutcome[]): TokenUsage {
  return outcomes.reduce<TokenUsage>((sum, outcome) => ({
    inputTokens: sum.inputTokens + (outcome.usage?.inputTokens ?? 0),
    outputTokens: sum.outputTokens + (outcome.usage?.outputTokens ?? 0),
    cacheReadTokens: sum.cacheReadTokens + (outcome.usage?.cacheReadTokens ?? 0),
    cacheCreationTokens: sum.cacheCreationTokens + (outcome.usage?.cacheCreationTokens ?? 0),
  }), {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
  });
}
