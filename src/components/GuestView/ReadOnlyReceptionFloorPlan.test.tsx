import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReadOnlyReceptionFloorPlan } from './ReadOnlyReceptionFloorPlan';

const useReceptionFloorPlanShare = vi.fn();

vi.mock('@/hooks/useReceptionFloorPlanShare', () => ({
  useReceptionFloorPlanShare: (token?: string) => useReceptionFloorPlanShare(token),
}));

vi.mock('@/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas', () => ({
  ReceptionFloorPlanCanvas: ({ readOnly, plan }: { readOnly: boolean; plan: { id: string } }) => (
    <div data-testid="reception-plan" data-read-only={String(readOnly)}>{plan.id}</div>
  ),
}));

describe('ReadOnlyReceptionFloorPlan', () => {
  beforeEach(() => {
    useReceptionFloorPlanShare.mockReset();
  });

  it('loads the token-gated plan into the read-only renderer', () => {
    useReceptionFloorPlanShare.mockReturnValue({
      data: {
        plan: { id: 'plan-1' },
        tables: [],
        event: { name: 'QA Event' },
      },
      backgroundUrl: null,
      loading: false,
      error: null,
    });

    render(<ReadOnlyReceptionFloorPlan token="secure-share-token" />);

    expect(useReceptionFloorPlanShare).toHaveBeenCalledWith('secure-share-token');
    expect(screen.getByTestId('reception-plan')).toHaveAttribute('data-read-only', 'true');
  });

  it('explains when the organiser has not provided a valid share token', () => {
    useReceptionFloorPlanShare.mockReturnValue({
      data: null,
      backgroundUrl: null,
      loading: false,
      error: 'Missing token.',
    });

    render(<ReadOnlyReceptionFloorPlan />);

    expect(screen.getByRole('alert')).toHaveTextContent('Reception floor plan unavailable');
    expect(screen.getByRole('alert')).toHaveTextContent('Missing token.');
  });
});
