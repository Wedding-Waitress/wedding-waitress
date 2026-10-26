import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { InvitationExporter } from './InvitationExporter';

const mocks = vi.hoisted(() => ({ png: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => ({ plan: {}, isStarterPlan: true }) }));
vi.mock('@/hooks/useGuests', () => ({ useGuests: () => ({ guests: [] }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/invitationExporter', () => ({ exportInvitationPNG: mocks.png,
  exportInvitationPDF: vi.fn(), exportInvitation2Up: vi.fn(), exportBulkPDF: vi.fn() }));
vi.mock('./InvitationSendModal', () => ({ InvitationSendModal: () => null }));
const Location = () => <output data-testid="path">{useLocation().pathname}</output>;

it('routes a trial export limit to current plan billing without generating a fourth export', async () => {
  render(<MemoryRouter><InvitationExporter template={{ background_url: '', orientation: 'portrait', width_mm: 148,
    height_mm: 210, text_zones: [] } as any} customText={{}} customStyles={{}} eventData={{}} eventId="event-fixture" /><Location /></MemoryRouter>);
  for (let count = 1; count <= 3; count++) {
    fireEvent.click(screen.getByRole('button', { name: /Download PNG/ }));
    await waitFor(() => expect(mocks.png).toHaveBeenCalledTimes(count));
    await waitFor(() => expect(screen.getByRole('button', { name: /Download PNG/ })).toBeEnabled());
  }
  fireEvent.click(screen.getByRole('button', { name: /Download PNG/ }));
  expect(await screen.findByText('Export Limit Reached')).toBeInTheDocument();
  expect(mocks.png).toHaveBeenCalledTimes(3);
  expect(screen.getByText('Ultimate Plan')).toBeInTheDocument();
  expect(screen.getByText('Up to 200 guests')).toBeInTheDocument();
  expect(screen.getByText('Up to 400 guests')).toBeInTheDocument();
  expect(screen.getByText('A$218.90 including 10% GST')).toBeInTheDocument();
  expect(screen.getByText('A$328.90 including 10% GST')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View Plans' }));
  expect(screen.getByTestId('path')).toHaveTextContent('/account/plan-billing');
});
