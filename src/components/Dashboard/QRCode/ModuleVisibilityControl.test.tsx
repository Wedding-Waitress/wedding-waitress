import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModuleVisibilityControl } from './ModuleVisibilityControl';
describe('module visibility presentation', () => {
  it('uses clean loading text and provides an explicit failed-load retry', () => {
    const retry = vi.fn();
    const view = render(<ModuleVisibilityControl label="Photo/Logo" enabled={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading saved settings...');
    view.rerender(<ModuleVisibilityControl label="Photo/Logo" enabled={undefined} failed onRetry={retry} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
  it('shows a neutral loading placeholder without a false OFF switch', () => {
    render(<ModuleVisibilityControl label="RSVP Invite" enabled={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading saved settings');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByText('Not displayed on app')).not.toBeInTheDocument();
  });
  it('updates its status, switch and configuration controls immediately', () => {
    function Example() {
      const [enabled, setEnabled] = React.useState(false);
      return <><ModuleVisibilityControl label="RSVP Invite" enabled={enabled} onChange={setEnabled} />{enabled && <button>Configure RSVP</button>}</>;
    }
    render(<Example />);
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Displayed on app')).toBeInTheDocument();
    expect(screen.getByText('Configure RSVP')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Not displayed on app')).toBeInTheDocument();
    expect(screen.queryByText('Configure RSVP')).not.toBeInTheDocument();
  });
});
