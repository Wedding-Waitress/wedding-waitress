import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RunningSheetShareModal } from './RunningSheetShareModal';
import type { RunningSheetShareToken } from '@/types/runningSheet';
import { buildRunningSheetUrl } from '@/lib/urlUtils';

const toast = vi.fn();
const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ update })) },
}));

const activeToken: RunningSheetShareToken = {
  id: 'token-row-1',
  sheet_id: 'sheet-1',
  token: 'active_token-123',
  permission: 'view_only',
  recipient_name: 'Run Sheet',
  expires_at: '2099-01-01T00:00:00.000Z',
  last_accessed_at: null,
  created_at: '2026-08-21T00:00:00.000Z',
};

const renderModal = (tokens: RunningSheetShareToken[] = [activeToken], onGenerateToken = vi.fn()) => render(
  <RunningSheetShareModal
    open
    onOpenChange={vi.fn()}
    shareTokens={tokens}
    onGenerateToken={onGenerateToken}
    onDeleteToken={vi.fn()}
    eventSlug="andy-and-cathy"
  />,
);

const selectManageTab = (count: number) => {
  const tab = screen.getByRole('tab', { name: `Manage (${count})` });
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Create Link' }), { key: 'ArrowRight' });
  tab.focus();
  fireEvent.keyDown(tab, { key: 'Enter' });
};

describe('RunningSheetShareModal link lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    vi.spyOn(window, 'open').mockReturnValue(null);
  });

  it('creates and copies the canonical environment-aware URL', async () => {
    const generate = vi.fn().mockResolvedValue('new_token-456');
    renderModal([], generate);

    fireEvent.click(screen.getByRole('button', { name: 'Generate & Copy Link' }));

    await waitFor(() => expect(generate).toHaveBeenCalledWith('view_only', undefined, 90));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      buildRunningSheetUrl('new_token-456', 'andy-and-cathy'),
    );
  });

  it('copies and opens the identical active managed link directly and securely', async () => {
    renderModal();
    selectManageTab(1);

    fireEvent.click(await screen.findByRole('button', { name: 'Copy link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open link' }));

    const expected = buildRunningSheetUrl(activeToken.token, 'andy-and-cathy');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected);
    expect(window.open).toHaveBeenCalledWith(expected, '_blank', 'noopener,noreferrer');
  });

  it('preserves permission controls and rejects expired managed actions', async () => {
    const expired = { ...activeToken, id: 'expired', expires_at: '2020-01-01T00:00:00.000Z' };
    renderModal([activeToken, expired]);
    selectManageTab(2);

    expect(await screen.findByText('Expired')).toBeVisible();
    const openButtons = screen.getAllByRole('button', { name: 'Open link' });
    expect(openButtons[0]).toBeEnabled();
    expect(openButtons[1]).toBeDisabled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Toggle link permission' })[0]);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ permission: 'can_edit' }));
  });

  it.each([1440, 768, 390])('keeps every modal action available at %ipx', async (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    window.dispatchEvent(new Event('resize'));
    renderModal();

    expect(screen.getByRole('dialog')).toHaveAttribute('data-running-sheet-share-modal');
    expect(screen.getByRole('tab', { name: 'Create Link' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Manage (1)' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Generate & Copy Link' })).toBeVisible();
  });
});
