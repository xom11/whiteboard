'use client';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { FunctionRow } from '../FunctionRow';
import { createStore } from '../../../../../core/scene/store';
import { createEmptyState } from '../../../../../core/scene/types';
import '../../../../../core/scene/kinds';

function makeStore() {
  const store = createStore(createEmptyState('graph2d'));
  store.dispatch({
    type: 'ADD',
    payload: {
      obj: {
        id: 'f1',
        kind: 'function2d',
        label: 'f1',
        visible: true,
        locked: false,
        layer: 'default',
        schemaVersion: 1,
        attrs: { expression: 'x^2', color: '#2563eb', visible: true },
      },
    },
  });
  return store;
}

describe('FunctionRow', () => {
  it('hiển thị label và expression', () => {
    const store = makeStore();
    const obj = store.getState().objects.f1;
    render(
      <FunctionRow
        obj={obj as never}
        store={store}
        selected={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByTestId('function-row-input-f1')).toHaveValue('x^2');
    expect(screen.getByText(/f1/)).toBeInTheDocument();
  });

  it('Enter trên input dispatches UPDATE_ATTRS với expression mới', () => {
    const store = makeStore();
    const obj = store.getState().objects.f1;
    render(
      <FunctionRow
        obj={obj as never}
        store={store}
        selected={false}
        onClick={() => {}}
      />,
    );
    const input = screen.getByTestId('function-row-input-f1');
    fireEvent.change(input, { target: { value: 'sin(x)' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(store.getState().objects.f1.attrs.expression).toBe('sin(x)');
  });

  it('Blur dispatches UPDATE_ATTRS nếu giá trị đổi', () => {
    const store = makeStore();
    const obj = store.getState().objects.f1;
    render(
      <FunctionRow
        obj={obj as never}
        store={store}
        selected={false}
        onClick={() => {}}
      />,
    );
    const input = screen.getByTestId('function-row-input-f1');
    fireEvent.change(input, { target: { value: 'cos(x)' } });
    fireEvent.blur(input);
    expect(store.getState().objects.f1.attrs.expression).toBe('cos(x)');
  });

  it('Escape resets local draft về expression ban đầu', () => {
    const store = makeStore();
    const obj = store.getState().objects.f1;
    render(
      <FunctionRow
        obj={obj as never}
        store={store}
        selected={false}
        onClick={() => {}}
      />,
    );
    const input = screen.getByTestId('function-row-input-f1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'invalid(((' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('x^2');
    expect(store.getState().objects.f1.attrs.expression).toBe('x^2');
  });

  it('expression không hợp lệ: hiện error, KHÔNG dispatch', () => {
    const store = makeStore();
    const obj = store.getState().objects.f1;
    render(
      <FunctionRow
        obj={obj as never}
        store={store}
        selected={false}
        onClick={() => {}}
      />,
    );
    const input = screen.getByTestId('function-row-input-f1');
    fireEvent.change(input, { target: { value: '(((' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Store giữ nguyên expression cũ
    expect(store.getState().objects.f1.attrs.expression).toBe('x^2');
    // Error indicator xuất hiện
    expect(screen.getByTestId('function-row-error-f1')).toBeInTheDocument();
  });

  it('toggle visibility dispatches UPDATE_ATTRS visible=false', () => {
    const store = makeStore();
    const obj = store.getState().objects.f1;
    render(
      <FunctionRow
        obj={obj as never}
        store={store}
        selected={false}
        onClick={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText('Ẩn/hiện hàm'));
    expect(store.getState().objects.f1.attrs.visible).toBe(false);
  });
});
