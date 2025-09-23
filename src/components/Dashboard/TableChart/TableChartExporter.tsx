import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartSettings } from './TableSeatingChartPage';
import { TableWithGuestCount } from '@/hooks/useTables';
import { Guest } from '@/hooks/useGuests';
import { useToast } from '@/hooks/use-toast';
import { generateTableChartPDF, generateTableChartImage } from '@/lib/tableChartEngine';
import { 
  Download, 
  FileImage, 
  FileText,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';

interface TableChartExporterProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChartSettings;
  tables: TableWithGuestCount[];
  guests: Guest[];
  event: any;
}

type ExportStatus = 'idle' | 'generating' | 'success' | 'error';

export const TableChartExporter: React.FC<TableChartExporterProps> = ({
  isOpen,
  onClose,
  settings,
  tables,
  guests,
  event
}) => {
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'jpg'>('pdf');
  const { toast } = useToast();

  const handleExport = async (format: 'pdf' | 'png' | 'jpg') => {
    setExportFormat(format);
    setExportStatus('generating');
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      let blob: Blob;
      let filename: string;
      const eventName = event?.name || 'Event';
      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === 'pdf') {
        blob = await generateTableChartPDF(settings, tables, guests, event);
        filename = `${eventName}-Seating-Chart-${timestamp}.pdf`;
      } else {
        blob = await generateTableChartImage(settings, tables, guests, event, format);
        filename = `${eventName}-Seating-Chart-${timestamp}.${format}`;
      }

      clearInterval(progressInterval);
      setProgress(100);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus('success');
      
      toast({
        title: "Export Successful",
        description: `Your seating chart has been downloaded as ${filename}`,
      });

      // Close after a delay
      setTimeout(() => {
        onClose();
        setExportStatus('idle');
        setProgress(0);
      }, 2000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
      
      toast({
        title: "Export Failed",
        description: "There was an error generating your seating chart. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    switch (exportStatus) {
      case 'generating':
        return <Loader className="w-5 h-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Download className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (exportStatus) {
      case 'generating':
        return `Generating ${exportFormat.toUpperCase()}...`;
      case 'success':
        return 'Export completed successfully!';
      case 'error':
        return 'Export failed. Please try again.';
      default:
        return 'Choose export format';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Export Seating Chart
          </DialogTitle>
          <DialogDescription>
            {getStatusText()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export Options */}
          {exportStatus === 'idle' && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Choose Format:</div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-3"
                  onClick={() => handleExport('pdf')}
                >
                  <FileText className="w-6 h-6" />
                  <span className="text-xs">PDF</span>
                  <Badge variant="secondary" className="text-xs">Best for print</Badge>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-3"
                  onClick={() => handleExport('png')}
                >
                  <FileImage className="w-6 h-6" />
                  <span className="text-xs">PNG</span>
                  <Badge variant="secondary" className="text-xs">High quality</Badge>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-3"
                  onClick={() => handleExport('jpg')}
                >
                  <FileImage className="w-6 h-6" />
                  <span className="text-xs">JPG</span>
                  <Badge variant="secondary" className="text-xs">Smaller size</Badge>
                </Button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {exportStatus === 'generating' && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="text-sm text-muted-foreground text-center">
                {progress}% complete
              </div>
            </div>
          )}

          {/* Export Summary */}
          {exportStatus !== 'idle' && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="text-sm font-medium">Export Details:</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Format: {exportFormat.toUpperCase()}</div>
                <div>Tables: {tables.length}</div>
                <div>Guests: {guests.length}</div>
                <div>Paper Size: {settings.paperSize}</div>
                <div>Layout: Grid</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {exportStatus === 'idle' && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            
            {exportStatus === 'error' && (
              <>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button variant="gradient" onClick={() => setExportStatus('idle')}>
                  Try Again
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};