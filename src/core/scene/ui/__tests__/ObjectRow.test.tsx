import * as React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ObjectRow } from '../ObjectRow';
import type { SceneObject, State } from '../../types';

import { registerKind, getKind } from '../../registry';

const FAKE_KIND = 'fakepoint';
try {
  getKind(FAKE_KIND);
} catch {
  registerKind({
    type: FAKE_KIND,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (obj) => `${obj.label} = fake(${(obj.attrs as { x: number }).x})`,
    measure: (obj) => {
      const x = (obj.attrs as { x?: number }).x;
      if (typeof x !== 'number') return null;
      return [{ label: 'x', value: x }];
    },
    render: () => ({}),
  });
}

const FAKE_NO_MEASURE = 'fakenomeasure';
try {
  getKind(FAKE_NO_MEASURE);
} catch {
  registerKind({
    type: FAKE_NO_MEASURE,
    schemaVersion: 1,
    migrate: {},
    dependsOn: () => [],
    describe: (obj) => obj.label,
    render: () => ({}),
  });
}

function makeObj(over: Partial<SceneObject> = {}): SceneObject {
  return {
    id: 'A1',
    kind: FAKE_KIND,
    label: 'A',
    visible: true,
    locked: false,
    attrs: { x: 1, color: '#ff0000' },
    ...over,
  } as SceneObject;
}

const STATE: State = { objects: { A1: makeObj() }, order: ['A1'], counter: 1, meta: { domain: '2d', version: 1 } };

describe('ObjectRow', () => {
  function setup(over: Partial<React.ComponentProps<typeof ObjectRow>> = {}, obj = makeObj()) {
    const onSelect = jest.fn();
    const onToggleVisible = jest.fn();
    const onToggleLocked = jest.fn();
    const onRename = jest.fn();
    const onChangeColor = jest.fn();
    const onDelete = jest.fn();
    const utils = render(
      <ObjectRow
        obj={obj}
        state={STATE}
        selected={false}
        onSelect={onSelect}
        onToggleVisible={onToggleVisible}
        onToggleLocked={onToggleLocked}
        onRename={onRename}
        onChangeColor={onChangeColor}
        onDelete={onDelete}
        {...over}
      />,
    );
    return { ...utils, onSelect, onToggleVisible, onToggleLocked, onRename, onChangeColor, onDelete };
  }

  it('renders label and describe summary', () => {
    setup();
    expect(screen.getByTestId('object-row-A1')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText(/fake\(1\)/)).toBeInTheDocument();
  });

  it('renders fallback summary for unknown kind without throwing', () => {
    setup({}, makeObj({ kind: 'totally-unknown' }));
    expect(screen.getByTestId('object-row-A1')).toBeInTheDocument();
  });

  it('color-dot reflects obj.color and visible state', () => {
    const { rerender } = setup();
    const dot = screen.getByLabelText('Toggle visibility') as HTMLButtonElement;
    // jsdom normalizes backgroundColor to rgb() but keeps borderColor as-is
    expect(dot.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(dot.style.borderColor).toMatch(/^(#ff0000|rgb\(255, ?0, ?0\))$/i);

    rerender(
      <ObjectRow
        obj={makeObj({ visible: false })}
        state={STATE}
        selected={false}
        onSelect={jest.fn()}
        onToggleVisible={jest.fn()}
        onToggleLocked={jest.fn()}
        onRename={jest.fn()}
        onChangeColor={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const hiddenDot = screen.getByLabelText('Toggle visibility') as HTMLButtonElement;
    expect(hiddenDot.style.backgroundColor).toBe('transparent');
    expect(hiddenDot.style.borderColor).toMatch(/^(#ff0000|rgb\(255, ?0, ?0\))$/i);
    expect(hiddenDot).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to gray dot when obj.color missing', () => {
    setup({}, makeObj({ attrs: { x: 1 } }));
    const dot = screen.getByLabelText('Toggle visibility') as HTMLButtonElement;
    expect(dot.style.backgroundColor).toBe('rgb(136, 136, 136)');
  });

  it('clicking color-dot triggers onToggleVisible but NOT onSelect', () => {
    const { onToggleVisible, onSelect } = setup();
    fireEvent.click(screen.getByLabelText('Toggle visibility'));
    expect(onToggleVisible).toHaveBeenCalledWith('A1');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('clicking row body triggers onSelect', () => {
    const { onSelect } = setup();
    fireEvent.click(screen.getByText('A'));
    expect(onSelect).toHaveBeenCalledWith('A1');
  });

  it('no inline lock button (lock is in 3-dots menu)', () => {
    setup();
    expect(screen.queryByLabelText('Toggle lock')).not.toBeInTheDocument();
  });

  it('renders detail block when selected and kind has measure()', () => {
    setup({ selected: true });
    const detail = screen.getByTestId('object-row-detail-A1');
    expect(detail).toBeInTheDocument();
    expect(detail.textContent).toMatch(/x = 1\.00/);
  });

  it('does NOT render detail block when not selected', () => {
    setup({ selected: false });
    expect(screen.queryByTestId('object-row-detail-A1')).not.toBeInTheDocument();
  });

  it('does NOT render detail block when kind has no measure', () => {
    setup({ selected: true }, makeObj({ kind: FAKE_NO_MEASURE }));
    expect(screen.queryByTestId('object-row-detail-A1')).not.toBeInTheDocument();
  });

  it('applies selected styling', () => {
    setup({ selected: true });
    expect(screen.getByTestId('object-row-A1')).toHaveAttribute('aria-selected', 'true');
  });

  it('opens menu and clicking Khoá triggers onToggleLocked', () => {
    const { onToggleLocked, onSelect } = setup();
    fireEvent.click(screen.getByLabelText('Row menu'));
    fireEvent.click(screen.getByText('Khoá'));
    expect(onToggleLocked).toHaveBeenCalledWith('A1');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('menu shows "Mở khoá" when locked=true', () => {
    setup({}, makeObj({ locked: true }));
    fireEvent.click(screen.getByLabelText('Row menu'));
    expect(screen.getByText('Mở khoá')).toBeInTheDocument();
  });

  it('menu delete → onDelete(id)', () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByLabelText('Row menu'));
    fireEvent.click(screen.getByText('Xoá'));
    expect(onDelete).toHaveBeenCalledWith('A1');
  });
});
