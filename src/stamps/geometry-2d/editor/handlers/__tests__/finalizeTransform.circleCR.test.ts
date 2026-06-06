import { finalizeTransform } from '../transform';

test('finalizeTransform circleCR dispatch circle {center, radius}', () => {
  const dispatched: { payload: { obj?: { kind: string; attrs: Record<string, unknown> } } }[] = [];
  let n = 0;
  const ctx = {
    store: { getState: () => ({ counter: n, objects: {} }), dispatch: (a: never) => { n += 1; dispatched.push(a as never); } },
    nextLabel: () => 'c',
    flashWarn: () => {},
  } as never;
  finalizeTransform(ctx, 'circleCR', ['ctr1'], 3.5);
  expect(dispatched[0].payload.obj!.kind).toBe('circle');
  expect(dispatched[0].payload.obj!.attrs).toMatchObject({ center: 'ctr1', radius: 3.5 });
});
