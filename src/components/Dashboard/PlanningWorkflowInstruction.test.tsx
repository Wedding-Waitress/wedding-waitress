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
    expect(container.querySelector('[data-workflow-step-number]')).toHaveTextContent(number);
    fireEvent.click(screen.getByRole('button', { name: `Continue to ${nextLabel}` }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('can hide only the My Events number badge while retaining its introduction card', () => {
    const onContinue = vi.fn();
    const { container } = render(
      <PlanningWorkflowInstruction stepId="my-events" onContinue={onContinue} showStepNumber={false} />,
    );

    expect(container.firstElementChild).toHaveAttribute('data-workflow-step');
    expect(container.querySelector('[data-workflow-step-number]')).not.toBeInTheDocument();
    expect(screen.getByText('My Events')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Event Budget Planner' }));
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
