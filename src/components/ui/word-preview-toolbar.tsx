import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ZoomIn, Ruler, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

export interface WordPreviewToolbarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showMargins: boolean;
  onToggleMargins: (show: boolean) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onQuickExport?: () => void;
  exportLabel?: string;
}

export const WordPreviewToolbar: React.FC<WordPreviewToolbarProps> = ({
  zoom,
  onZoomChange,
  showMargins,
  onToggleMargins,
  currentPage,
  totalPages,
  onPageChange,
  onQuickExport,
  exportLabel = 'Export as Word'
}) => {
  return (
    <div className="word-preview-toolbar">
      {/* Zoom Control */}
      <div className="flex items-center gap-2">
        <ZoomIn className="w-4 h-4 text-muted-foreground" />
        <Select value={zoom.toString()} onValueChange={(val) => onZoomChange(parseInt(val))}>
          <SelectTrigger className="w-[100px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25%</SelectItem>
            <SelectItem value="50">50%</SelectItem>
            <SelectItem value="75">75%</SelectItem>
            <SelectItem value="100">100%</SelectItem>
            <SelectItem value="150">150%</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Show Margins Toggle */}
      <Button
        variant={showMargins ? "default" : "outline"}
        size="sm"
        onClick={() => onToggleMargins(!showMargins)}
        className="flex items-center gap-2"
      >
        <Ruler className="w-4 h-4" />
        Show Margins
      </Button>

      {/* Page Navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium whitespace-nowrap px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Quick Export Button */}
      {onQuickExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onQuickExport}
          className="flex items-center gap-2 ml-auto"
        >
          <FileText className="w-4 h-4" />
          {exportLabel}
        </Button>
      )}
    </div>
  );
};
