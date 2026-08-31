import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { RoomShapePanel } from './RoomShapePanel';

const makePlan = (): ReceptionFloorPlan => ({
  room_width_m: 15,
  room_length_m: 20,
  room_polygon: null,
} as ReceptionFloorPlan);

describe('Reception room-shape controls', () => {
  it('retains Rectangle, L-shape, T-shape, and Custom Polygon updates', () => {
    let plan = makePlan();
    const onChange = (mutator: (current: ReceptionFloorPlan) => ReceptionFloorPlan) => {
      plan = mutator(plan);
    };
    const view = render(<RoomShapePanel plan={plan} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'L-shape' }));
    expect(plan.room_polygon?.kind).toBe('L');
    view.rerender(<RoomShapePanel plan={plan} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'T-shape' }));
    expect(plan.room_polygon?.kind).toBe('T');
    view.rerender(<RoomShapePanel plan={plan} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Custom polygon' }));
    expect(plan.room_polygon?.kind).toBe('custom');
    view.rerender(<RoomShapePanel plan={plan} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rectangle' }));
    expect(plan.room_polygon).toBeNull();
  });
});
