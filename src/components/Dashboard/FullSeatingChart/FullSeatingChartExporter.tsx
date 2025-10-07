import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Progress } from '@/components/ui/progress';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Guest } from '@/hooks/useGuests';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { generateFullSeatingChartPDF } from '@/lib/fullSeatingChartPdfGenerator';

interface FullSeatingChartExporterProps {
  event: any;
  guests: Guest[];
  settings: FullSeatingChartSettings;
  onClose: () => void;
  onExportStart: () => void;
  onExportEnd: () => void;
}

export const FullSeatingChartExporter: React.FC<FullSeatingChartExporterProps> = ({
  event,
  guests,
  settings,
  onClose,
  onExportStart,
  onExportEnd
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      onExportStart();
      setProgress(10);

      // Generate PDF using shared generator
      setProgress(50);
      const pdfBlob = await generateFullSeatingChartPDF(event, guests, settings);
      
      setProgress(90);

      // Save PDF
      const fileName = `${event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_seating_chart.pdf`;
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      setProgress(100);

      // Complete
      setTimeout(() => {
        setIsExporting(false);
        onExportEnd();
        onClose();
      }, 500);

    } catch (error) {
      console.error('Error generating PDF:', error);
      setIsExporting(false);
      onExportEnd();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Seating Chart
          </DialogTitle>
          <DialogDescription>
            Generate a PDF of your complete guest list with check-off boxes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export Details */}
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Event:</span>
              <span className="font-medium">{event.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Guests:</span>
              <span className="font-medium">{guests.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Format:</span>
              <span className="font-medium">PDF ({settings.paperSize})</span>
            </div>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF...
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isExporting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};