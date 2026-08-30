import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { ApprovalStatusPanel, APPROVAL_OPTIONS } from './ApprovalStatusPanel';
import { ShareLinkPanel } from './ShareLinkPanel';

const makePlan = (overrides: Partial<ReceptionFloorPlan> = {}) => ({
  approval_status: 'draft',
  share_enabled: false,
  share_token: null,
  ...overrides,
} as ReceptionFloorPlan);

describe('Reception venue sharing and approval controls', () => {
  it.each(APPROVAL_OPTIONS)('preserves the $label approval transition', ({ value, label }) => {
    const plan = makePlan();
    const onChange = vi.fn();

    render(<ApprovalStatusPanel plan={plan} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: label }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const mutate = onChange.mock.calls[0][0] as (current: ReceptionFloorPlan) => ReceptionFloorPlan;
    expect(mutate(plan).approval_status).toBe(value);
  });

  it('keeps link generation, revocation, and approval controls together in the Share card', async () => {
    const onGenerate = vi.fn().mockResolvedValue('share-token');
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    const onApprovalChange = vi.fn();
    const { rerender } = render(
      <ShareLinkPanel
        plan={makePlan()}
        onGenerate={onGenerate}
        onRevoke={onRevoke}
        onApprovalChange={onApprovalChange}
      />
    );

    expect(screen.getByRole('heading', { name: /share with venue coordinator/i })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /venue approval status/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1));

    rerender(
      <ShareLinkPanel
        plan={makePlan({ share_enabled: true, share_token: 'share-token' })}
        onGenerate={onGenerate}
        onRevoke={onRevoke}
        onApprovalChange={onApprovalChange}
      />
    );
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(onRevoke).toHaveBeenCalledTimes(1));
  });
});
