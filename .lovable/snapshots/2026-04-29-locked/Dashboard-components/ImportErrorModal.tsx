/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The Guest List page feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break guest list management
 * - Changes could break bulk actions and RSVP workflows
 * - Changes could break real-time synchronisation
 *
 * Last locked: 2026-02-19
 */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/enhanced-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle } from "lucide-react";
import { generateErrorReport, ImportError } from "@/lib/relationValidation";

interface ImportErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ImportError[];
  totalRows: number;
  successfulRows: number;
}

export const ImportErrorModal: React.FC<ImportErrorModalProps> = ({
  isOpen,
  onClose,
  errors,
  totalRows,
  successfulRows,
}) => {
  const handleDownloadErrors = () => {
    const errorReport = generateErrorReport(errors);
    const blob = new Blob([errorReport], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `import-errors-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const groupedErrors = errors.reduce((acc, error) => {
    if (!acc[error.rowIndex]) {
      acc[error.rowIndex] = [];
    }
    acc[error.rowIndex].push(error);
    return acc;
  }, {} as Record<number, ImportError[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Import Summary Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="flex gap-4 p-4 bg-muted/20 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{successfulRows}</div>
              <div className="text-xs text-muted-foreground">Imported</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{Object.keys(groupedErrors).length}</div>
              <div className="text-xs text-muted-foreground">Skipped Rows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{totalRows}</div>
              <div className="text-xs text-muted-foreground">Total Rows</div>
            </div>
          </div>

          {/* Error Details */}
          {errors.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Row Errors ({errors.length} issues)</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadErrors}
                  className="text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download Errors CSV
                </Button>
              </div>

              <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-4 space-y-3">
                  {Object.entries(groupedErrors).map(([rowIndex, rowErrors]) => (
                    <div key={rowIndex} className="border-l-2 border-destructive pl-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive" className="text-xs">
                          Row {rowIndex}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {rowErrors.length} error{rowErrors.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {rowErrors.map((error, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium text-destructive">{error.field}:</span>{' '}
                            <span className="text-muted-foreground">"{error.value}"</span> - {error.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};