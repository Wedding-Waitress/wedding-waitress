import type { LucideIcon } from 'lucide-react';
import { CalendarDays, TableProperties, UsersRound, WalletCards } from 'lucide-react';

export type PlanningWorkflowTabId = 'my-events' | 'dashboard' | 'table-list' | 'guest-list';

export interface PlanningWorkflowStep {
  id: PlanningWorkflowTabId;
  label: string;
  number: 1 | 2 | 3 | 4;
  icon: LucideIcon;
  actionLabel?: 'Start Here' | 'Create' | 'Add';
  instruction: string;
  nextId: PlanningWorkflowTabId | 'qr-code';
  nextLabel: string;
}

/** Authoritative order and instructional contract for the first four planning pages. */
export const PLANNING_WORKFLOW_STEPS: readonly PlanningWorkflowStep[] = [
  {
    id: 'my-events',
    label: 'My Events',
    number: 1,
    icon: CalendarDays,
    actionLabel: 'Start Here',
    instruction: 'Create and manage your event first. When complete, continue to the Event Budget Planner.',
    nextId: 'dashboard',
    nextLabel: 'Event Budget Planner',
  },
  {
    id: 'dashboard',
    label: 'Event Budget Planner',
    number: 2,
    icon: WalletCards,
    instruction: 'Plan and manage the event budget. When complete, continue to Tables.',
    nextId: 'table-list',
    nextLabel: 'Tables',
  },
  {
    id: 'table-list',
    label: 'Tables',
    number: 3,
    icon: TableProperties,
    actionLabel: 'Create',
    instruction: 'Create the Head Table and remaining guest tables. When complete, continue to Guest List.',
    nextId: 'guest-list',
    nextLabel: 'Guest List',
  },
  {
    id: 'guest-list',
    label: 'Guest List',
    number: 4,
    icon: UsersRound,
    actionLabel: 'Add',
    instruction: 'Add and manage guests and allocate them to tables. When complete, continue to the QR Code Seating Chart.',
    nextId: 'qr-code',
    nextLabel: 'QR Code Seating Chart',
  },
] as const;

export const PLANNING_WORKFLOW_BY_ID = Object.fromEntries(
  PLANNING_WORKFLOW_STEPS.map((step) => [step.id, step]),
) as Record<PlanningWorkflowTabId, PlanningWorkflowStep>;

export const PLANNING_WORKFLOW_IDS = new Set<string>(PLANNING_WORKFLOW_STEPS.map((step) => step.id));
