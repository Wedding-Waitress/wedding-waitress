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
