import { createRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { FIXTURE_CATALOG, FIXTURE_PALETTE_CATALOG } from './fixtures';
import { ReceptionFloorPlanCanvas } from './ReceptionFloorPlanCanvas';

class TestDataTransfer {
  private values = new Map<string, string>();
  effectAllowed = 'all';
  dropEffect = 'none';

  get types() { return [...this.values.keys()]; }
  setData(type: string, value: string) { this.values.set(type, value); }
  getData(type: string) { return this.values.get(type) ?? ''; }
}

const makePlan = (): ReceptionFloorPlan => ({
  id: 'plan-1',
  event_id: 'event-1',
  room_width_m: 15,
  room_length_m: 20,
  grid_size_cm: 50,
  table_positions: [],
  fixtures: [],
  background: {
    path: null,
    x: 0,
    y: 0,
    width: null,
    height: null,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
  },
  room_polygon: null,
  share_enabled: false,
  share_token: null,
  approval_status: 'draft',
  vendor_notes: '',
  last_saved_at: '2026-08-20T00:00:00Z',
} as ReceptionFloorPlan);

describe('Reception fixture palette and scaled-room interactions', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
      unobserve() {}
    });
    let nextId = 0;
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(
      () => `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
    );
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('drags every available fixture through the scaled A4 layer and preserves its type and colour', async () => {
    let latestPlan = makePlan();
    const Harness = () => {
      const [plan, setPlan] = useState(latestPlan);
      latestPlan = plan;
      return (
        <ReceptionFloorPlanCanvas
          plan={plan}
          tables={[]}
          event={{ name: 'Jason & Linda' }}
          attendingCount={28}
          generatedAt={new Date('2026-08-20T00:00:00Z')}
          a4Ref={createRef<HTMLDivElement>()}
          backgroundUrl={null}
          onChange={(mutator) => setPlan((current) => mutator(current))}
        />
      );
    };

    const { container } = render(<Harness />);
    const prepareRoom = () => {
      const room = container.querySelector<HTMLElement>('[data-reception-room-canvas="true"]')!;
      Object.defineProperties(room, {
        offsetWidth: { configurable: true, value: 1000 },
        clientLeft: { configurable: true, value: 2 },
        clientTop: { configurable: true, value: 2 },
      });
      room.getBoundingClientRect = () => ({
        left: 100,
        top: 200,
        width: 500,
        height: 375,
        right: 600,
        bottom: 575,
        x: 100,
        y: 200,
        toJSON: () => ({}),
      });
      return room;
    };

    for (const [index, spec] of FIXTURE_PALETTE_CATALOG.entries()) {
      const transfer = new TestDataTransfer();
      fireEvent.dragStart(
        screen.getByRole('button', { name: `Add or drag ${spec.label} onto the reception floor plan` }),
        { dataTransfer: transfer },
      );
      const room = prepareRoom();
      const dropEvent = new MouseEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: 351,
        clientY: 388.5,
      });
      Object.defineProperty(dropEvent, 'dataTransfer', { value: transfer });
      fireEvent(room, dropEvent);
      await waitFor(() => expect(latestPlan.fixtures).toHaveLength(index + 1));
    }

    expect(latestPlan.fixtures.map((fixture) => fixture.type)).toEqual(
      FIXTURE_PALETTE_CATALOG.map((fixture) => fixture.type),
    );
    expect(latestPlan.fixtures.every((fixture) => fixture.x === 7.5 && fixture.y === 10)).toBe(true);
    const room = prepareRoom();
    expect(room).toHaveAttribute('data-canonical-room-width-m', '15');
    expect(room).toHaveAttribute('data-canonical-room-length-m', '20');
    expect(room).toHaveAttribute('data-presentation-width-m', '20');
    expect(room).toHaveAttribute('data-presentation-height-m', '15');
    expect(room.style.width).toBe('1000px');
    expect(room.style.height).toBe('750px');
    for (const spec of FIXTURE_PALETTE_CATALOG) {
      const card = screen.getByRole('button', {
        name: `Add or drag ${spec.label} onto the reception floor plan`,
      });
      expect(card).toHaveStyle({ backgroundColor: spec.color });
    }

    const placedWindow = container.querySelector<HTMLElement>('[data-reception-placed-fixture="window"] > div')!;
    expect(container.querySelectorAll('[data-reception-upright-label="fixture"]')).toHaveLength(FIXTURE_PALETTE_CATALOG.length);
    fireEvent.pointerDown(placedWindow, { pointerId: 1, clientX: 351, clientY: 388.5 });
    fireEvent.pointerMove(placedWindow, { pointerId: 1, clientX: 476, clientY: 451 });
    fireEvent.pointerUp(placedWindow, { pointerId: 1 });
    await waitFor(() => expect(latestPlan.fixtures.find((fixture) => fixture.type === 'window')).toEqual(expect.objectContaining({
      x: 5,
      y: 15,
    })));
    fireEvent.click(await screen.findByTitle('Rotate 15°'));
    await waitFor(() => expect(latestPlan.fixtures.find((fixture) => fixture.type === 'window')?.rotation).toBe(15));
    fireEvent.click(screen.getByTitle('Lock'));
    await waitFor(() => expect(latestPlan.fixtures.find((fixture) => fixture.type === 'window')?.locked).toBe(true));
    fireEvent.click(screen.getByTitle('Remove'));
    await waitFor(() => expect(latestPlan.fixtures).toHaveLength(FIXTURE_PALETTE_CATALOG.length - 1));

    fireEvent.click(screen.getByRole('button', {
      name: 'Add or drag Window onto the reception floor plan',
    }));
    await waitFor(() => expect(latestPlan.fixtures).toHaveLength(FIXTURE_PALETTE_CATALOG.length));
    expect(latestPlan.fixtures.at(-1)).toEqual(expect.objectContaining({
      type: 'window',
      x: 7.5,
      y: 10,
    }));
  });

  it('retains rendering support for persisted legacy Bridal Table fixtures without offering a duplicate palette action', () => {
    const plan = makePlan();
    plan.fixtures = [{
      id: 'legacy-bridal-table',
      type: 'bridal_table',
      label: 'Bridal Table',
      x: 7.5,
      y: 10,
      width_m: 4,
      height_m: 1,
      rotation: 0,
      locked: false,
    }];

    const { container } = render(
      <ReceptionFloorPlanCanvas
        plan={plan}
        tables={[]}
        event={{ name: 'Jason & Linda' }}
        attendingCount={28}
        generatedAt={new Date('2026-08-20T00:00:00Z')}
        a4Ref={createRef<HTMLDivElement>()}
        backgroundUrl={null}
        onChange={vi.fn()}
      />,
    );

    expect(FIXTURE_CATALOG.some((fixture) => fixture.type === 'bridal_table')).toBe(true);
    expect(FIXTURE_PALETTE_CATALOG.some((fixture) => fixture.type === 'bridal_table')).toBe(false);
    expect(container.querySelector('[data-reception-placed-fixture="bridal_table"]')).not.toBeNull();
    expect(screen.queryByRole('button', {
      name: 'Add or drag Bridal Table onto the reception floor plan',
    })).not.toBeInTheDocument();
  });

  it('reorients an uploaded venue background with the room without mutating its saved geometry', () => {
    const plan = makePlan();
    plan.background = {
      path: 'event-1/background.png',
      x: 2,
      y: 3,
      width: 10,
      height: 5,
      rotation: 30,
      opacity: 0.8,
      visible: true,
      locked: true,
    };
    const original = JSON.stringify(plan.background);
    const { container } = render(
      <ReceptionFloorPlanCanvas
        plan={plan}
        tables={[]}
        event={{ name: 'Jason & Linda' }}
        attendingCount={28}
        generatedAt={new Date('2026-08-20T00:00:00Z')}
        a4Ref={createRef<HTMLDivElement>()}
        backgroundUrl="data:image/png;base64,reception-background"
        onChange={vi.fn()}
      />,
    );

    const frame = container.querySelector<HTMLElement>('[data-reception-upright-background-frame="true"]')!;
    const image = frame.querySelector<HTMLImageElement>('img')!;
    expect(frame).toHaveStyle({
      left: '275px',
      top: '400px',
      width: '250px',
      height: '500px',
      transform: 'translate(-50%, -50%) rotate(30deg)',
    });
    expect(image).toHaveStyle({
      width: '500px',
      height: '250px',
      transform: 'translate(-50%, -50%) rotate(-90deg)',
    });
    expect(JSON.stringify(plan.background)).toBe(original);
  });
});
