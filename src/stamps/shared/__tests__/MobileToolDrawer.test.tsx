import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileToolDrawer } from '../MobileToolDrawer';

const baseProps = {
  title: 'Hình học',
  headerIcon: <span>★</span>,
  chips: [],
  actions: [],
  groups: [
    {
      group: 'g1',
      groupLabel: 'Cơ bản',
      tools: [{ key: 'move', label: 'Move', icon: <span>M</span> }],
    },
  ],
  activeTool: 'move',
  onToolSelect: jest.fn(),
  onDrawerClose: jest.fn(),
};

describe('MobileToolDrawer', () => {
  test('without objectsTab: no tab row, tools render directly', () => {
    render(<MobileToolDrawer {...baseProps} drawerOpen={true} />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('Cơ bản')).toBeInTheDocument();
  });

  test('with objectsTab: tab row appears, default active=tools', () => {
    render(
      <MobileToolDrawer
        {...baseProps}
        drawerOpen={true}
        objectsTab={{
          label: '📐 Đối tượng',
          render: () => <div data-testid="objects-body">obj</div>,
        }}
      />,
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByText('Cơ bản')).toBeInTheDocument();
    expect(screen.queryByTestId('objects-body')).toBeNull();
  });

  test('clicking objects tab switches body', () => {
    render(
      <MobileToolDrawer
        {...baseProps}
        drawerOpen={true}
        objectsTab={{
          label: '📐 Đối tượng',
          render: () => <div data-testid="objects-body">obj</div>,
        }}
      />,
    );
    fireEvent.click(screen.getByText('📐 Đối tượng'));
    expect(screen.getByTestId('objects-body')).toBeInTheDocument();
    expect(screen.queryByText('Cơ bản')).toBeNull();
  });

  test('reopen drawer resets tab to tools', () => {
    const { rerender } = render(
      <MobileToolDrawer
        {...baseProps}
        drawerOpen={true}
        objectsTab={{
          label: '📐 Đối tượng',
          render: () => <div data-testid="objects-body">obj</div>,
        }}
      />,
    );
    fireEvent.click(screen.getByText('📐 Đối tượng'));
    expect(screen.getByTestId('objects-body')).toBeInTheDocument();

    rerender(
      <MobileToolDrawer
        {...baseProps}
        drawerOpen={false}
        objectsTab={{
          label: '📐 Đối tượng',
          render: () => <div data-testid="objects-body">obj</div>,
        }}
      />,
    );
    rerender(
      <MobileToolDrawer
        {...baseProps}
        drawerOpen={true}
        objectsTab={{
          label: '📐 Đối tượng',
          render: () => <div data-testid="objects-body">obj</div>,
        }}
      />,
    );
    expect(screen.getByText('Cơ bản')).toBeInTheDocument();
    expect(screen.queryByTestId('objects-body')).toBeNull();
  });
});
