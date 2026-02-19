import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/enhanced-button";
import { Progress } from "@/components/ui/progress";
import { RelationSelector } from "./RelationSelector";
import { RelationPartner, RelationRole } from "@/lib/relationUtils";
import { ArrowLeft, ArrowRight, SkipForward, Users } from 'lucide-react';

export interface RelationAssignment {
  partner: RelationPartner;
  role: RelationRole;
}

export interface PersonToAssign {
  name: string;
  index: number; // -1 for main guest, 0+ for party members
}

interface RelationAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (assignments: RelationAssignment[]) => void;
  people: PersonToAssign[];
  partner1Name?: string | null;
  partner2Name?: string | null;
  customRoles?: string[];
  allowCustomRoles?: boolean;
  isSinglePerson?: boolean;
  eventId: string;
  relationRequired?: boolean;
  onCustomRoleAdded?: (roles: string[]) => void;
}

export const RelationAssignmentDialog: React.FC<RelationAssignmentDialogProps> = ({
  isOpen,
  onClose,
  onComplete,
  people,
  partner1Name,
  partner2Name,
  customRoles = [],
  allowCustomRoles = false,
  isSinglePerson = false,
  eventId,
  relationRequired = true,
  onCustomRoleAdded,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [assignments, setAssignments] = useState<RelationAssignment[]>(
    people.map(() => ({ partner: '' as RelationPartner, role: '' as RelationRole }))
  );
  const [selectorOpen, setSelectorOpen] = useState(false);

  const totalSteps = people.length;
  const currentPerson = people[currentStep];
  const currentAssignment = assignments[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const hasSelection = currentAssignment?.partner && currentAssignment?.role;

  const handleRelationChange = useCallback((partner: RelationPartner, role: RelationRole) => {
    setAssignments(prev => {
      const updated = [...prev];
      updated[currentStep] = { partner, role };
      return updated;
    });
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setSelectorOpen(false);
      setCurrentStep(prev => prev + 1);
    } else {
      // Last person — complete
      onComplete(assignments);
      resetAndClose();
    }
  };

  const handleSkip = () => {
    // Clear current assignment and move forward
    setAssignments(prev => {
      const updated = [...prev];
      updated[currentStep] = { partner: '' as RelationPartner, role: '' as RelationRole };
      return updated;
    });
    if (currentStep < totalSteps - 1) {
      setSelectorOpen(false);
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(assignments.map((a, i) => 
        i === currentStep ? { partner: '' as RelationPartner, role: '' as RelationRole } : a
      ));
      resetAndClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setSelectorOpen(false);
      setCurrentStep(prev => prev - 1);
    }
  };

  const resetAndClose = () => {
    setCurrentStep(0);
    setAssignments(people.map(() => ({ partner: '' as RelationPartner, role: '' as RelationRole })));
    setSelectorOpen(false);
    onClose();
  };

  // Reset when people change
  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setAssignments(people.map(() => ({ partner: '' as RelationPartner, role: '' as RelationRole })));
      setSelectorOpen(false);
    }
  }, [isOpen, people.length]);

  if (!isOpen || people.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl border-2 border-primary/30 top-[8%] translate-y-0 [&>button]:w-10 [&>button]:h-10 [&>button>svg]:!w-7 [&>button>svg]:!h-7">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-primary flex items-center gap-2">
              <Users className="w-5 h-5" />
              Assign Relation
            </DialogTitle>
            <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full mr-10">
              {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Current person name */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">What relationship is this guest to the couple?</p>
            <p className="text-xl font-bold text-foreground">{currentPerson?.name}</p>
          </div>

          {/* Relation Selector */}
          <div className="px-2">
            <RelationSelector
              value={{
                partner: currentAssignment?.partner || '' as RelationPartner,
                role: currentAssignment?.role || '' as RelationRole,
              }}
              onChange={handleRelationChange}
              partner1Name={partner1Name}
              partner2Name={isSinglePerson ? undefined : partner2Name}
              customRoles={customRoles}
              allowCustomRoles={allowCustomRoles}
              isSinglePerson={isSinglePerson}
              isOpen={selectorOpen}
              onToggle={() => setSelectorOpen(!selectorOpen)}
              eventId={eventId}
              onCustomRoleAdded={onCustomRoleAdded}
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={handleBack}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            {!relationRequired && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                onClick={handleSkip}
              >
                <SkipForward className="w-4 h-4 mr-1" />
                Skip
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="rounded-full bg-green-500 hover:bg-green-600 text-white"
            onClick={handleNext}
            disabled={relationRequired && !hasSelection}
          >
            {currentStep < totalSteps - 1 ? (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              'Confirm & Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
