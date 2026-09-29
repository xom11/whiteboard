import type { Intent3DT } from '../intent';
import type { Clause3D } from '../deterministic/coverage3d';

export interface RuleContext3D {
  problem: string;
  clauses: readonly Clause3D[];
  /** Nhánh dựng khối ưu tiên (tryDeterministicFigure3d thử 'refine' rồi 'khoi' nếu lần đầu hỏng). */
  solidPref?: 'refine' | 'khoi';
}

export interface RuleMatch3D {
  ruleId: string;
  clauseIds: number[];
  intents: Intent3DT[];
}

export interface LanguageRule3D {
  id: string;
  priority: number;
  languages: readonly ('vi' | 'en')[];
  patterns: readonly RegExp[];
  match(ctx: RuleContext3D): RuleMatch3D[];
}
