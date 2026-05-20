'use client';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ParameterRow } from '../ParameterRow';
import { createStore } from '../../../../../core/scene/store';
import { createEmptyState } from '../../../../../core/scene/types';
import '../../../../../core/scene/kinds';

function makeStore() {
  const store = createStore(createEmptyState('graph2d'));
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id: 'a',
        kind: 'parameter',
        label: 'a',
        visible: true,
        locked: false,
        layer: 'default',
        schemaVersion: 1,
        attrs: { value: 1, min: -5, max: 5, step: 0.1 },
      },
    },
  });
  return store;
}

describe('ParameterRow', () => {
  it('hiển thị label và slider với giá trị hiện tại', () => {
    const store = makeStore();
    const obj = store.getState().objects.a;
    render(
      <ParameterRow
        obj={obj as never}
        store={store}
        selected={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText(/\ba\b/)).toBeInTheDocument();
    const slider = screen.getByTestId('parameter-row-slider-a') as HTMLInputElement;
    expect(slider.value).toBe('1');
    expect(slider.min).toBe('-5');
    expect(slider.max).toBe('5');
    expect(slider.step).toBe('0.1');
  });

  it('slider change dispatches UPDATE_ATTRS value', () => {
    const store = makeStore();
    const obj = store.getState().objects.a;
    render(
      <ParameterRow
        obj={obj as never}
        store={store}
        selected={false}
        onClick={() => {}}
      />,
    );
    const slider = screen.getByTestId('parameter-row-slider-a');
    fireEvent.change(slider, { target: { value: '3' } });
    expect(store.getState().objects.a.attrs.value).toBe(3);
  });

  it('hiển thị giá trị số hiện tại', () => {
    const store = makeStore();
    const obj = store.getState().objects.a;
    render(
      <ParameterRow
        obj={obj as never}
        store={store}
        selected={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByTestId('parameter-row-value-a')).toHaveTextContent('1');
  });

  it('selected=true phản ánh qua aria-selected', () => {
    const store = makeStore();
    const obj = store.getState().objects.a;
    const { getByTestId } = render(
      <ParameterRow
        obj={obj as never}
        store={store}
        selected={true}
        onClick={() => {}}
      />,
    );
    expect(getByTestId('parameter-row-a')).toHaveAttribute('aria-selected', 'true');
  });

  it('click row gọi onClick', () => {
    const store = makeStore();
    const obj = store.getState().objects.a;
    const onClick = jest.fn();
    render(
      <ParameterRow
        obj={obj as never}
        store={store}
        selected={false}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByTestId('parameter-row-a'));
    expect(onClick).toHaveBeenCalled();
  });
});
