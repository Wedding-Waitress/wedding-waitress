import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import styles from './RecordActionPair.module.css';

export interface RecordActionPairProps {
  editLabel: string;
  deleteLabel: string;
  disabled?: boolean;
  showLabels?: boolean;
  onEdit: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const RecordActionHeading = () => <span className={styles.heading}>Actions</span>;

/** Match the accepted My Events row actions without changing My Events itself. */
export const RecordActionPair = ({ editLabel, deleteLabel, disabled, onEdit, onDelete, showLabels = false }: RecordActionPairProps) => (
  <span className={`${styles.pair} ${showLabels ? styles.withLabels : ''}`} data-record-action-pair>
    <TooltipProvider>
      <Tooltip><TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} aria-label={editLabel} title={editLabel} onClick={onEdit} className={`${styles.action} ${styles.edit} ww-emboss-green ww-emboss-green-soft`}>
          <Pencil size={17} strokeWidth={1.8} aria-hidden="true" />
          {showLabels && <span>Edit</span>}
        </Button>
      </TooltipTrigger><TooltipContent><p>{editLabel}</p></TooltipContent></Tooltip>
      <Tooltip><TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} aria-label={deleteLabel} title={deleteLabel} onClick={onDelete} className={`${styles.action} ${styles.remove} ww-emboss-red`}>
          <Trash2 size={17} strokeWidth={1.8} aria-hidden="true" />
          {showLabels && <span>Delete</span>}
        </Button>
      </TooltipTrigger><TooltipContent><p>{deleteLabel}</p></TooltipContent></Tooltip>
    </TooltipProvider>
  </span>
);
