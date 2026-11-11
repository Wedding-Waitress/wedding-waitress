import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SidebarProvider, Sidebar, useSidebar } from './sidebar';
const viewport = vi.hoisted(() => ({ mobile: true }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => viewport.mobile }));
function OpenNavigation() {
  const { toggleSidebar } = useSidebar();
  return <button onClick={toggleSidebar}>Open navigation</button>;
}
function setup() {
  return render(<SidebarProvider><OpenNavigation /><Sidebar><button>My Events</button></Sidebar></SidebarProvider>);
}
afterEach(() => vi.restoreAllMocks());
describe('Navigation drawer accessibility', () => {
  it('opens a named mobile dialog and dismisses with Escape without missing title or description diagnostics', async () => {
    viewport.mobile = true;
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = await screen.findByRole('dialog', { name: 'Wedding Waitress navigation' });
    expect(drawer.getAttribute('aria-describedby')).toBeTruthy();
    expect(document.getElementById(drawer.getAttribute('aria-describedby')!)?.textContent).toBe('Choose a page or manage your account.');
    expect(screen.getByRole('button', { name: 'My Events' })).toBeTruthy();
    fireEvent.keyDown(drawer, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(errors.mock.calls.flat().join(' ')).not.toMatch(/DialogTitle|DialogContent/);
    expect(warnings.mock.calls.flat().join(' ')).not.toMatch(/Description|aria-describedby/);
  });
  it('keeps the desktop sidebar available without a mobile dialog', () => {
    viewport.mobile = false;
    setup();
    expect(screen.getByRole('button', { name: 'My Events' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
