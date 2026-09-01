import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PLANNING_WORKFLOW_BY_ID, type PlanningWorkflowTabId } from '@/config/planningWorkflow';

interface PlanningWorkflowInstructionProps {
  stepId: PlanningWorkflowTabId;
  onContinue: (tabId: string) => void;
}

export const PlanningWorkflowInstruction: React.FC<PlanningWorkflowInstructionProps> = ({ stepId, onContinue }) => {
  const step = PLANNING_WORKFLOW_BY_ID[stepId];
  return (
    <section
      className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-[#d7b985]/70 bg-[#fffaf2] px-4 py-3 text-[#412419] shadow-sm md:flex-row md:items-center"
      aria-label={`Planning workflow step ${step.number}`}
      data-workflow-step={step.number}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#412419] text-sm font-bold text-[#fff8ee]">{step.number}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong>{step.label}</strong>
            {step.actionLabel === 'Start Here' && <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">Start Here</span>}
          </div>
          <p className="mt-1 break-words text-sm leading-6 text-[#6f625b]">{step.instruction}</p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full border border-[#70452f] px-4 text-sm font-semibold text-[#412419] hover:bg-[#f6efe5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#412419] md:w-auto"
        onClick={() => onContinue(step.nextId)}
      >
        Continue to {step.nextLabel}<ArrowRight size={15} aria-hidden="true" />
      </button>
    </section>
  );
};
