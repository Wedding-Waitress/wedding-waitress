import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, Download } from 'lucide-react';

interface FullSeatingChartPrintOptionsProps {
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
  onDownloadPDF: () => void;
}

export const FullSeatingChartPrintOptions: React.FC<FullSeatingChartPrintOptionsProps> = ({
  open,
  onClose,
  onPrint,
  onDownloadPDF
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Print Options</DialogTitle>
          <DialogDescription>
            Choose how you'd like to output your seating chart
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Print Preview Option */}
          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => {
              onClose();
              onPrint();
            }}
          >
            <CardContent className="flex items-start gap-4 p-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <Printer className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Print Preview</h3>
                <p className="text-sm text-muted-foreground">
                  Open your browser's print dialog to print directly or save as PDF
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Download PDF Option */}
          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => {
              onClose();
              onDownloadPDF();
            }}
          >
            <CardContent className="flex items-start gap-4 p-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Download PDF</h3>
                <p className="text-sm text-muted-foreground">
                  Generate and download a PDF file of your seating chart
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
