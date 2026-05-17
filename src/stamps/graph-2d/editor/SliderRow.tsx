'use client';

export interface SliderRowProps {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onRemove: () => void;
  onRangeChange: (min: number, max: number, step: number) => void;
}

export function SliderRow(props: SliderRowProps) {
  const { name, value, min, max, step } = props;
  return (
    <div className="graph-slider-row" data-testid={`graph-slider-row-${name}`}>
      <div className="graph-slider-header">
        <span className="graph-slider-name">{name}</span>
        <span className="graph-slider-value">= {value.toFixed(2)}</span>
        <button
          type="button"
          aria-label={`Xoá tham số ${name}`}
          className="graph-slider-remove"
          onClick={props.onRemove}
        >
          ✕
        </button>
      </div>
      <input
        type="range"
        aria-label={`Slider ${name}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
        className="graph-slider-input"
      />
      <div className="graph-slider-range">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
