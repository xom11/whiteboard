import { render } from '@testing-library/react';
import { createRef } from 'react';
import { MiniBoard3D, type MiniBoard3DHandle } from '../editor/MiniBoard3D';

jest.mock('jsxgraph', () => ({
  __esModule: true,
  default: {
    Options: { text: { display: 'html' } },
    JSXGraph: {
      initBoard: jest.fn(() => ({
        create: jest.fn((kind: string) => {
          if (kind === 'view3d') {
            return {
              create: jest.fn(() => ({ id: 'mock-obj' })),
              defaultAxes: [],
              az: { Value: () => 0.7 },
              el: { Value: () => 0.4 },
            };
          }
          return { id: 'mock-obj' };
        }),
        on: jest.fn(),
        off: jest.fn(),
        renderer: { container: document.createElement('div') },
      })),
      freeBoard: jest.fn(),
    },
  },
}));

describe('MiniBoard3D', () => {
  it('mount + dispose không lỗi', () => {
    const ref = createRef<MiniBoard3DHandle>();
    const { unmount } = render(<MiniBoard3D ref={ref} isDark={false} />);
    expect(ref.current).toBeTruthy();
    expect(typeof ref.current?.getTool).toBe('function');
    expect(ref.current?.getTool()).toBe('move');
    unmount();
  });

  it('setTool đổi tool active', () => {
    const ref = createRef<MiniBoard3DHandle>();
    render(<MiniBoard3D ref={ref} isDark={false} />);
    ref.current!.setTool('sphere');
    expect(ref.current!.getTool()).toBe('sphere');
  });

  it('getCreationLog trả [] ban đầu', () => {
    const ref = createRef<MiniBoard3DHandle>();
    render(<MiniBoard3D ref={ref} isDark={false} />);
    expect(ref.current!.getCreationLog()).toEqual([]);
  });

  it('getViewState trả default azimuth/elevation', () => {
    const ref = createRef<MiniBoard3DHandle>();
    render(<MiniBoard3D ref={ref} isDark={false} />);
    const state = ref.current!.getViewState();
    expect(typeof state.azimuth).toBe('number');
    expect(typeof state.elevation).toBe('number');
    expect(Array.isArray(state.bbox3D)).toBe(true);
    expect(state.bbox3D.length).toBe(6);
  });

  it('subscribe + unsubscribe', () => {
    const ref = createRef<MiniBoard3DHandle>();
    render(<MiniBoard3D ref={ref} isDark={false} />);
    const cb = jest.fn();
    const unsub = ref.current!.subscribe(cb);
    ref.current!.setTool('point');
    expect(cb).toHaveBeenCalled();
    unsub();
    cb.mockClear();
    ref.current!.setTool('move');
    expect(cb).not.toHaveBeenCalled();
  });
});
