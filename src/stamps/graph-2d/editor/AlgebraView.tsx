'use client';

import { FunctionRow } from './FunctionRow';
import { SliderRow } from './SliderRow';
import type { SerializedGraph } from '../serialize';
import { MAX_FUNCTIONS } from '../colors';

export interface AlgebraViewProps {
  graph: SerializedGraph;
  errors: Record<string, string | null>;
  onAddFunctionDraft: () => void;
  onCommitFunctionExpr: (id: string, expr: string) => void;
  onToggleFunctionVisible: (id: string) => void;
  onRemoveFunction: (id: string) => void;
  onParameterChange: (name: string, value: number) => void;
  onParameterRangeChange: (name: string, min: number, max: number, step: number) => void;
  onRemoveParameter: (name: string) => void;
}

export function AlgebraView(props: AlgebraViewProps) {
  const { graph, errors } = props;
  const atMax = graph.functions.length >= MAX_FUNCTIONS;

  return (
    <div className="graph-algebra-view">
      <div className="graph-algebra-section">
        {graph.functions.map((f) => (
          <FunctionRow
            key={f.id}
            id={f.id}
            name={f.name}
            expression={f.expression}
            color={f.color}
            visible={f.visible}
            error={errors[f.id] ?? null}
            onExpressionCommit={(expr) => props.onCommitFunctionExpr(f.id, expr)}
            onToggleVisible={() => props.onToggleFunctionVisible(f.id)}
            onRemove={() => props.onRemoveFunction(f.id)}
          />
        ))}
        <button
          type="button"
          aria-label="Thêm hàm số"
          className="graph-algebra-add"
          onClick={props.onAddFunctionDraft}
          disabled={atMax}
        >
          + Thêm hàm
        </button>
      </div>

      {graph.parameters.length > 0 ? (
        <div className="graph-algebra-section graph-algebra-parameters">
          {graph.parameters.map((p) => (
            <SliderRow
              key={p.name}
              name={p.name}
              value={p.value}
              min={p.min}
              max={p.max}
              step={p.step}
              onChange={(v) => props.onParameterChange(p.name, v)}
              onRangeChange={(min, max, step) =>
                props.onParameterRangeChange(p.name, min, max, step)
              }
              onRemove={() => props.onRemoveParameter(p.name)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
