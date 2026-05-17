import { render, act } from '@testing-library/react';
import { ToolbarInjector } from '../ToolbarInjector';
import { STABLE_STAMPS } from '../registry';

function makeExcalidrawDOM() {
  document.body.innerHTML = `
    <div class="excalidraw">
      <div class="App-toolbar">
        <div class="Stack_horizontal">
          <button class="App-toolbar__extra-tools-trigger">More tools</button>
        </div>
      </div>
      <div class="dropdown-menu App-toolbar__extra-tools-dropdown">
        <div class="dropdown-menu-container"></div>
      </div>
    </div>
  `;
}

describe('ToolbarInjector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('inject stamps vào More tools popover khi popover mount', async () => {
    makeExcalidrawDOM();
    render(
      <ToolbarInjector
        enabled
        activeStampKind={null}
        onToggle={() => {}}
        stamps={STABLE_STAMPS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const container = document.querySelector(
      '.App-toolbar__extra-tools-dropdown .dropdown-menu-container',
    );
    expect(container).not.toBeNull();
    expect(container!.querySelector('[data-testid="stamp-toolbar-geometry"]')).not.toBeNull();
    expect(container!.querySelector('[data-testid="stamp-toolbar-latex"]')).not.toBeNull();
  });

  it('KHÔNG inject inline vào main toolbar (.Stack_horizontal)', async () => {
    makeExcalidrawDOM();
    render(
      <ToolbarInjector
        enabled
        activeStampKind={null}
        onToggle={() => {}}
        stamps={STABLE_STAMPS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    const inlineWrapper = document.querySelector(
      '.Stack_horizontal #stamp-toolbar-portal-wrapper',
    );
    expect(inlineWrapper).toBeNull();
  });

  it('cleanup wrapper khi unmount', async () => {
    makeExcalidrawDOM();
    const { unmount } = render(
      <ToolbarInjector
        enabled
        activeStampKind={null}
        onToggle={() => {}}
        stamps={STABLE_STAMPS}
      />,
    );
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(document.getElementById('stamp-menu-portal-wrapper')).not.toBeNull();
    unmount();
    expect(document.getElementById('stamp-menu-portal-wrapper')).toBeNull();
  });

  it('observer disconnect khi unmount (không leak)', async () => {
    makeExcalidrawDOM();
    const disconnectSpy = jest.fn();
    const observeSpy = jest.fn();
    const originalMO = global.MutationObserver;
    class MockMO {
      constructor(public cb: MutationCallback) {}
      observe(target: Node, opts?: MutationObserverInit) {
        observeSpy(target, opts);
      }
      disconnect() {
        disconnectSpy();
      }
      takeRecords() {
        return [];
      }
    }
    // @ts-expect-error mock
    global.MutationObserver = MockMO;
    try {
      const { unmount } = render(
        <ToolbarInjector
          enabled
          activeStampKind={null}
          onToggle={() => {}}
          stamps={STABLE_STAMPS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(200);
      });
      expect(observeSpy).toHaveBeenCalled();
      unmount();
      expect(disconnectSpy).toHaveBeenCalled();
    } finally {
      global.MutationObserver = originalMO;
    }
  });

  it('scope observer xuống .excalidraw container (không observe document.body)', async () => {
    makeExcalidrawDOM();
    const observed: Node[] = [];
    const originalMO = global.MutationObserver;
    class MockMO {
      constructor(public cb: MutationCallback) {}
      observe(target: Node) {
        observed.push(target);
      }
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    // @ts-expect-error mock
    global.MutationObserver = MockMO;
    try {
      render(
        <ToolbarInjector
          enabled
          activeStampKind={null}
          onToggle={() => {}}
          stamps={STABLE_STAMPS}
        />,
      );
      await act(async () => {
        jest.advanceTimersByTime(200);
      });
      // .excalidraw đã có sẵn → observer phải attach trực tiếp vào nó, không vào body
      const excalidraw = document.querySelector('.excalidraw');
      expect(excalidraw).not.toBeNull();
      const last = observed[observed.length - 1];
      expect(last).toBe(excalidraw);
      expect(last).not.toBe(document.body);
    } finally {
      global.MutationObserver = originalMO;
    }
  });
});
