import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftPanelShell, TabPill, Section } from '../LeftPanelShell';

describe('LeftPanelShell', () => {
  const icon = <span data-testid="hdr-icon">★</span>;

  test('renders title + close button', () => {
    const onClose = jest.fn();
    render(
      <LeftPanelShell title="Hình học" icon={icon} onClose={onClose}>
        <div>body</div>
      </LeftPanelShell>,
    );
    expect(screen.getByText('Hình học')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /đóng/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not render tablist when tabs prop missing or length<2', () => {
    const { rerender } = render(
      <LeftPanelShell title="t" icon={icon} onClose={() => {}}>
        body
      </LeftPanelShell>,
    );
    expect(screen.queryByRole('tablist')).toBeNull();

    rerender(
      <LeftPanelShell
        title="t"
        icon={icon}
        onClose={() => {}}
        tabs={[{ key: 'a', label: 'A' }]}
        activeTab="a"
        onTabChange={() => {}}
      >
        body
      </LeftPanelShell>,
    );
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  test('renders tablist + tabs with aria-selected when 2+ tabs', () => {
    const onTabChange = jest.fn();
    render(
      <LeftPanelShell
        title="t"
        icon={icon}
        onClose={() => {}}
        tabs={[
          { key: 'tools', label: '🧰 Công cụ', testId: 'tab-tools' },
          { key: 'objects', label: '📐 Đối tượng', testId: 'tab-objects' },
        ]}
        activeTab="tools"
        onTabChange={onTabChange}
      >
        <div data-testid="body">tools body</div>
      </LeftPanelShell>,
    );
    const list = screen.getByRole('tablist');
    expect(list).toBeInTheDocument();
    const toolsTab = screen.getByTestId('tab-tools');
    const objectsTab = screen.getByTestId('tab-objects');
    expect(toolsTab).toHaveAttribute('aria-selected', 'true');
    expect(objectsTab).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(objectsTab);
    expect(onTabChange).toHaveBeenCalledWith('objects');
  });

  test('body has role tabpanel when tabs present', () => {
    render(
      <LeftPanelShell
        title="t"
        icon={icon}
        onClose={() => {}}
        tabs={[
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ]}
        activeTab="a"
        onTabChange={() => {}}
      >
        body
      </LeftPanelShell>,
    );
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });
});

describe('TabPill', () => {
  test('renders with aria-selected mirroring active', () => {
    render(<TabPill active={true} onClick={() => {}}>x</TabPill>);
    expect(screen.getByRole('tab')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Section', () => {
  test('renders label uppercase + children', () => {
    render(<Section label="Bố cục"><div data-testid="kid">k</div></Section>);
    expect(screen.getByText('Bố cục')).toBeInTheDocument();
    expect(screen.getByTestId('kid')).toBeInTheDocument();
  });
});
