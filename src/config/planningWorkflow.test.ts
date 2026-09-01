import { describe, expect, it } from 'vitest';
import { PLANNING_WORKFLOW_STEPS } from './planningWorkflow';

describe('authoritative planning workflow', () => {
  it('keeps the approved first four pages, numbering and next-page chain', () => {
    expect(PLANNING_WORKFLOW_STEPS.map(({ id, label, number, nextId }) => ({ id, label, number, nextId }))).toEqual([
      { id: 'my-events', label: 'My Events', number: 1, nextId: 'dashboard' },
      { id: 'dashboard', label: 'Event Budget Planner', number: 2, nextId: 'table-list' },
      { id: 'table-list', label: 'Tables', number: 3, nextId: 'guest-list' },
      { id: 'guest-list', label: 'Guest List', number: 4, nextId: 'qr-code' },
    ]);
  });

  it('shows Start Here only on My Events', () => {
    expect(PLANNING_WORKFLOW_STEPS.filter((step) => step.actionLabel === 'Start Here').map((step) => step.id)).toEqual(['my-events']);
  });
});
