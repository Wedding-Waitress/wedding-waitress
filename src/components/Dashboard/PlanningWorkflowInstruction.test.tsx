import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlanningWorkflowInstruction } from './PlanningWorkflowInstruction';

describe('planning workflow instruction strips', () => {
  it.each([
    ['my-events', '1', 'Event Budget Planner'],
    ['dashboard', '2', 'Tables'],
    ['table-list', '3', 'Guest List'],
    ['guest-list', '4', 'QR Code Seating Chart'],
  ] as const)('renders step %s and links to its approved next page', (stepId, number, nextLabel) => {
    const onContinue = vi.fn();
    const { container } = render(<PlanningWorkflowInstruction stepId={stepId} onContinue={onContinue} />);
    expect(container.querySelector(`[data-workflow-step="${number}"]`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Continue to ${nextLabel}` }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('uses responsive, non-overflowing layout classes and reserves Start Here for My Events', () => {
    const { container, rerender } = render(<PlanningWorkflowInstruction stepId="my-events" onContinue={vi.fn()} />);
    expect(container.firstElementChild).toHaveClass('min-w-0', 'overflow-hidden', 'md:flex-row');
    expect(screen.getByText('Start Here')).toBeInTheDocument();
    rerender(<PlanningWorkflowInstruction stepId="dashboard" onContinue={vi.fn()} />);
    expect(screen.queryByText('Start Here')).not.toBeInTheDocument();
  });
});
