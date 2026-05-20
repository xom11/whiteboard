import * as React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ObjectRow } from '../ObjectRow';
import type { SceneObject, State } from '../../types';

// Register a fake kind for testing.
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
    layer: 'default',
    schemaVersion: 1,
    attrs: { x: 1 },
    ...over,
  };
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

  it('renders displayName, label and describe summary', () => {
    setup();
    expect(screen.getByTestId('object-row-A1')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText(/fake\(1\)/)).toBeInTheDocument();
  });

  it('renders fallback icon for unknown kind', () => {
    setup({}, makeObj({ kind: 'totally-unknown' }));
    expect(screen.getByTestId('object-row-A1')).toBeInTheDocument();
    // No throw; row still renders.
  });

  it('click row → onSelect(id)', () => {
    const { onSelect } = setup();
    fireEvent.click(screen.getByTestId('object-row-A1'));
    expect(onSelect).toHaveBeenCalledWith('A1');
  });

  it('eye button → onToggleVisible(id), stops propagation', () => {
    const { onToggleVisible, onSelect } = setup();
    fireEvent.click(screen.getByLabelText('Toggle visibility'));
    expect(onToggleVisible).toHaveBeenCalledWith('A1');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('lock button → onToggleLocked(id), stops propagation', () => {
    const { onToggleLocked, onSelect } = setup();
    fireEvent.click(screen.getByLabelText('Toggle lock'));
    expect(onToggleLocked).toHaveBeenCalledWith('A1');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('menu delete → onDelete(id)', () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByLabelText('Row menu'));
    fireEvent.click(screen.getByText('Xoá'));
    expect(onDelete).toHaveBeenCalledWith('A1');
  });

  it('applies selected styling when selected=true', () => {
    setup({ selected: true });
    expect(screen.getByTestId('object-row-A1')).toHaveAttribute('aria-selected', 'true');
  });

  it('eye button shows hidden state when not visible', () => {
    setup({}, makeObj({ visible: false }));
    expect(screen.getByLabelText('Toggle visibility')).toHaveAttribute('aria-pressed', 'true');
  });
});
