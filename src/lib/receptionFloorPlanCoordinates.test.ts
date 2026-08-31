import { describe, expect, it } from 'vitest';

import {
  clientPointToReceptionRoom,
  createReceptionLandscapePresentation,
  getReceptionCanvasMetrics,
  receptionLandscapePointToRoom,
  receptionRoomPointToLandscape,
  receptionRoomPolygonToLandscape,
} from './receptionFloorPlanCoordinates';

describe('Reception floor-plan pointer coordinate conversion', () => {
  const presentation = createReceptionLandscapePresentation(15, 20);

  it('maps the canonical 15 x 20 m room to a 20 x 15 m landscape presentation', () => {
    expect(presentation).toEqual({
      canonicalWidth: 15,
      canonicalHeight: 20,
      displayWidth: 20,
      displayHeight: 15,
    });
    expect(receptionRoomPointToLandscape({ x: 0, y: 0 }, presentation)).toEqual({ x: 0, y: 15 });
    expect(receptionRoomPointToLandscape({ x: 15, y: 20 }, presentation)).toEqual({ x: 20, y: 0 });
  });

  it.each([
    { x: 0, y: 0 },
    { x: 15, y: 20 },
    { x: 7.25, y: 11.5 },
    { x: 2.5, y: 18.75 },
  ])('round-trips canonical point $x,$y without mutating it', (point) => {
    const original = { ...point };
    const displayed = receptionRoomPointToLandscape(point, presentation);
    expect(receptionLandscapePointToRoom(displayed, presentation)).toEqual(point);
    expect(point).toEqual(original);
  });

  it('transforms custom polygon points consistently without changing the source polygon', () => {
    const points = [{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 8, y: 20 }];
    const original = JSON.stringify(points);
    expect(receptionRoomPolygonToLandscape(points, presentation)).toEqual([
      { x: 0, y: 15 },
      { x: 0, y: 0 },
      { x: 20, y: 7 },
    ]);
    expect(JSON.stringify(points)).toBe(original);
  });

  it.each([1, 0.8, 0.55, 0.45])(
    'maps the same transformed room point back to canonical data at preview scale %s',
    (scale) => {
      const metrics = getReceptionCanvasMetrics({
        rectLeft: 320,
        rectTop: 480,
        rectWidth: 1000 * scale,
        offsetWidth: 1000,
        clientLeft: 2,
        clientTop: 2,
      });
      const expected = { x: 7.25, y: 11.5 };
      const displayed = receptionRoomPointToLandscape(expected, presentation);
      const point = clientPointToReceptionRoom(
        metrics.originX + displayed.x * 50 * scale,
        metrics.originY + displayed.y * 50 * scale,
        metrics,
        50,
        presentation,
      );

      expect(point.x).toBeCloseTo(expected.x, 10);
      expect(point.y).toBeCloseTo(expected.y, 10);
    },
  );

  it('is independent of viewport scroll and horizontal centring', () => {
    const base = getReceptionCanvasMetrics({
      rectLeft: 500,
      rectTop: 900,
      rectWidth: 600,
      offsetWidth: 1000,
      clientLeft: 2,
      clientTop: 2,
    });
    const scrolled = getReceptionCanvasMetrics({
      rectLeft: 120,
      rectTop: 140,
      rectWidth: 600,
      offsetWidth: 1000,
      clientLeft: 2,
      clientTop: 2,
    });
    const roomPoint = { x: 9.5, y: 4.25 };
    const displayed = receptionRoomPointToLandscape(roomPoint, presentation);

    const fromBase = clientPointToReceptionRoom(
      base.originX + displayed.x * 50 * base.scale,
      base.originY + displayed.y * 50 * base.scale,
      base,
      50,
      presentation,
    );
    const fromScrolled = clientPointToReceptionRoom(
      scrolled.originX + displayed.x * 50 * scrolled.scale,
      scrolled.originY + displayed.y * 50 * scrolled.scale,
      scrolled,
      50,
      presentation,
    );

    expect(fromBase.x).toBeCloseTo(roomPoint.x, 10);
    expect(fromBase.y).toBeCloseTo(roomPoint.y, 10);
    expect(fromScrolled.x).toBeCloseTo(roomPoint.x, 10);
    expect(fromScrolled.y).toBeCloseTo(roomPoint.y, 10);
  });
});
