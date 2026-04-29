/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This DJ-MC Questionnaire feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break questionnaire data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
 */
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface DJMCProgressIndicatorProps {
  progress: number;
}

export function DJMCProgressIndicator({ progress }: DJMCProgressIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        Progress:
      </span>
      <Progress value={progress} className="w-32 h-2" />
      <span className="text-sm font-medium text-primary">
        {progress}%
      </span>
    </div>
  );
}
