import type { Store } from '../../../../core/scene';
import type { SceneHit } from '../hitTest/hitTest';
import type { ToolKey, ToolStep, ToolSpec, CollectedArg } from './spec';
import { TOOLS } from './spec';

interface ControllerState {
  tool: ToolSpec | null;
  stepIndex: number;
  collected: CollectedArg[];
  hint: string;
}

type Listener = (state: ControllerState) => void;

function stepHint(step: ToolStep): string {
  return step.type === 'number' ? step.prompt : step.hint;
}

export class ToolController {
  private state: ControllerState = { tool: null, stepIndex: 0, collected: [], hint: '' };
  private listeners = new Set<Listener>();

  constructor(private store: Store) {
    this.selectTool('move');
  }

  getState(): ControllerState { return this.state; }

  on(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  selectTool(key: ToolKey): void {
    const tool = TOOLS.find((t) => t.key === key) ?? TOOLS.find((t) => t.key === 'move')!;
    const firstStep = tool.steps[0];
    this.state = {
      tool,
      stepIndex: 0,
      collected: [],
      hint: firstStep ? stepHint(firstStep) : tool.hintIdle,
    };
    this.notify();
  }

  cancel(): void { this.selectTool('move'); }

  consumeHit(hit: SceneHit): boolean {
    const tool = this.state.tool;
    if (!tool) return false;
    const step = tool.steps[this.state.stepIndex];
    if (!step) return false;

    // Polygon-like variable-vertex flow: when current step is closingPoint, an
    // existing-point hit matching the first collected vertex finalizes the
    // sub-sequence; any other surface hit appends another vertex (and the
    // controller stays at this stepIndex).
    if (step.type === 'closingPoint') {
      if (hit.kind === 'empty') return false;
      if (hit.kind === 'existingPoint') {
        this.state.collected.push({ step, hit });
        this.state.stepIndex++;
        this.advance();
        return true;
      }
      // Otherwise append another vertex using the previous 'point' step's allowNewOn
      const prevStep = tool.steps[this.state.stepIndex - 1];
      if (!prevStep || prevStep.type !== 'point') return false;
      if (!this.hitMatchesStep(hit, prevStep)) return false;
      this.state.collected.push({ step: prevStep, hit });
      // stepIndex stays at the closingPoint step
      this.notify();
      return true;
    }

    if (!this.hitMatchesStep(hit, step)) return false;
    this.state.collected.push({ step, hit });
    this.state.stepIndex++;
    this.advance();
    return true;
  }

  consumeNumber(value: number): boolean {
    const tool = this.state.tool;
    if (!tool) return false;
    const step = tool.steps[this.state.stepIndex];
    if (!step || step.type !== 'number') return false;
    if (step.min != null && value < step.min) return false;
    if (step.max != null && value > step.max) return false;
    this.state.collected.push({ step, value });
    this.state.stepIndex++;
    this.advance();
    return true;
  }

  private hitMatchesStep(hit: SceneHit, step: ToolStep): boolean {
    if (hit.kind === 'empty') return false;
    // Bước 'object': chọn cả đối tượng (mặt/đường/đa giác/cầu) — KHÔNG đặt điểm.
    // Khớp khi kind của hit ánh xạ về một loại object nằm trong step.kinds.
    if (step.type === 'object') {
      const objKind: Partial<Record<SceneHit['kind'], 'plane' | 'polygon' | 'line' | 'sphere'>> = {
        onPlane: 'plane', onPolygon: 'polygon', onLine: 'line', onSphere: 'sphere',
      };
      const k = objKind[hit.kind];
      return k != null && step.kinds.includes(k);
    }
    if (step.type !== 'point' && step.type !== 'closingPoint') return false;
    if (step.type === 'closingPoint') return hit.kind === 'existingPoint';
    if (hit.kind === 'existingPoint') return step.allowExisting;
    const surfaceMap: Record<string, 'ground' | 'axis' | 'plane' | 'line' | 'polygon' | 'sphere'> = {
      onGround: 'ground', onAxis: 'axis', onPlane: 'plane',
      onLine: 'line', onPolygon: 'polygon', onSphere: 'sphere',
    };
    const k = surfaceMap[hit.kind];
    return k != null && step.type === 'point' && step.allowNewOn.includes(k);
  }

  private advance(): void {
    const tool = this.state.tool!;
    if (this.state.stepIndex >= tool.steps.length) {
      tool.build(this.state.collected, this.store);
      if (tool.repeatAfterBuild) {
        // Stay in this tool so the user can place several items in a row.
        this.state.stepIndex = 0;
        this.state.collected = [];
        this.state.hint = stepHint(tool.steps[0]);
        this.notify();
      } else {
        this.selectTool('move');
      }
      return;
    }
    this.state.hint = stepHint(tool.steps[this.state.stepIndex]);
    this.notify();
  }

  private notify(): void {
    for (const cb of this.listeners) cb(this.state);
  }
}
