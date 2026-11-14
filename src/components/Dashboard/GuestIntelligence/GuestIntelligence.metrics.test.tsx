import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Accordion } from '@/components/ui/accordion';
import type { Guest } from '@/hooks/useGuests';
import { computeDietaryInsights } from './lib/computeGuestInsights';
import { EngagementIntelligenceSection } from './sections/EngagementIntelligenceSection';

vi.mock('@/hooks/useEventGuestActivities', () => ({ useEventGuestActivities: () => ({
 loading: false,
 activities: [0, 1, 2, 3, 4, 99].map(i => ({ guest_id: `guest-${i}`, activity_type: 'rsvp_changed', occurred_at: '2026-10-01T00:00:00Z' })),
}) }));
afterEach(cleanup);
const guest = (i: number, extras = {}) => ({ id: `guest-${i}`, first_name: `Guest ${i}`, last_name: 'Example', rsvp_invite_status: i === 0 ? 'both_sent' : 'not_sent', ...extras }) as Guest;

describe('Guest Intelligence data boundaries', () => {
 it('keeps invited engagement within its cohort and ignores activity for absent guests', () => {
  render(<Accordion type="multiple" defaultValue={['engagement']}><EngagementIntelligenceSection guests={Array.from({length:13},(_,i)=>guest(i))} eventId="event" /></Accordion>);
  expect(screen.getByText('1 of 1 invited guest have interacted')).toBeInTheDocument();
  expect(screen.getByText('100%')).toBeInTheDocument();
  expect(screen.queryByText('500%')).not.toBeInTheDocument();
  expect(screen.getByText('Engaged').parentElement).toHaveTextContent('5');
 });
 it('treats explicit no dietary requirements as answered, without inventing a dietary category', () => {
  const result = computeDietaryInsights([
   guest(0,{rsvp:'Attending',dietary:'None'}), guest(1,{rsvp:'Attending',dietary:'No'}),
   guest(2,{rsvp:'Attending',dietary:'Halal'}), guest(3,{rsvp:'Attending',dietary:''}),
   guest(4,{rsvp:'Pending',dietary:''}),
  ]);
  expect(result).toMatchObject({ attendingTotal:4, totalWithDietary:1, missing:1, completionPct:0.75 });
  expect(result.breakdown).toEqual([{tag:'Halal',count:1}]);
 });
});
