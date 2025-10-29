import React from 'react';
import { Loader2 } from 'lucide-react';

export const ProcessingPill: React.FC = () => {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-900">
      <Loader2 className="w-4 h-4 animate-spin" />
      Processing...
    </div>
  );
};
