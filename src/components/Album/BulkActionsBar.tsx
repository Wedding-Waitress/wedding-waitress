import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Trash, Download } from 'lucide-react';

interface BulkActionsBarProps {
  count: number;
  onApprove: () => void;
  onHide: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

export const BulkActionsBar = ({ 
  count, 
  onApprove, 
  onHide, 
  onDelete, 
  onDownload 
}: BulkActionsBarProps) => {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={onApprove} disabled={count === 0}>
        <Eye className="w-4 h-4 mr-1" />
        Show ({count})
      </Button>
      <Button size="sm" onClick={onHide} disabled={count === 0}>
        <EyeOff className="w-4 h-4 mr-1" />
        Hide ({count})
      </Button>
      <Button size="sm" variant="destructive" onClick={onDelete} disabled={count === 0}>
        <Trash className="w-4 h-4 mr-1" />
        Delete ({count})
      </Button>
      <Button size="sm" onClick={onDownload} disabled={count === 0}>
        <Download className="w-4 h-4 mr-1" />
        Download ({count})
      </Button>
    </div>
  );
};
