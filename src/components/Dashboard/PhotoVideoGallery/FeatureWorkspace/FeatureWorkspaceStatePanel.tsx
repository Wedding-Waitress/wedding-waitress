import React from 'react';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import managementStyles from '../photoVideoSharingManagement.module.css';

interface FeatureWorkspaceStatePanelProps {
  state: 'loading' | 'empty' | 'error';
  loadingLabel: string;
  emptyLabel: string;
  error?: string | null;
}

export const FeatureWorkspaceStatePanel: React.FC<FeatureWorkspaceStatePanelProps> = ({
  state,
  loadingLabel,
  emptyLabel,
  error,
}) => (
  <section
    className={`p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-3 rounded-xl ${managementStyles.loadingGlassPanel}`}
    aria-live="polite"
    data-workspace-state={state}
  >
    {state === 'loading' ? (
      <LoaderCircle className={`animate-spin h-6 w-6 ${managementStyles.loadingGlassSpinner}`} strokeWidth={1.8} />
    ) : (
      <TriangleAlert className={`h-7 w-7 ${managementStyles.loadingGlassSpinner}`} strokeWidth={1.8} />
    )}
    <p className={`text-sm break-words ${managementStyles.loadingGlassText}`}>
      {state === 'loading' ? loadingLabel : error || emptyLabel}
    </p>
  </section>
);
