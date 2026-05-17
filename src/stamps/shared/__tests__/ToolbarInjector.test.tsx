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
});
