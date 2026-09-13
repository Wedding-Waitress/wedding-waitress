import React from 'react';
import { RunningSheetSection } from '@/components/Dashboard/RunningSheet/RunningSheetSection';
import type { RunningSheetItem } from '@/types/runningSheet';

export interface AdminPreviewRunSheet {
  id: string;
  label: string | null;
  notes: string | null;
  items: RunningSheetItem[];
}

// Deliberately do not mount useRunningSheet: it creates defaults on first fetch.
// The owner preview only renders explicitly fetched, saved rows, including empty sheets.
const noWrite = () => undefined;
export function AdminReadOnlyRunSheet({ sheet }: { sheet: AdminPreviewRunSheet | null }) {
  if (!sheet) return <p>No saved Run Sheet recorded.</p>;
  return <RunningSheetSection label={sheet.label ?? 'Run Sheet'} notes={sheet.notes}
    items={sheet.items} readOnly allowReset={false}
    onLabelChange={noWrite} onNotesChange={noWrite} onUpdateItem={noWrite}
    onAddItem={noWrite} onDeleteItem={noWrite} onRestoreItems={async () => null}
    onDuplicateItem={noWrite} onReorderItems={noWrite} onResetToDefault={noWrite} />;
}
