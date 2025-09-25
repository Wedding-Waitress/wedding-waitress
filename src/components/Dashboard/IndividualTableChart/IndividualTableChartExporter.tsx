import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Image, FileText, Loader2 } from 'lucide-react';
import { Guest } from '@/hooks/useGuests';
import { TableWithGuestCount } from '@/hooks/useTables';
import { IndividualChartSettings } from './IndividualTableSeatingChartPage';
import { generateIndividualTableChartPDF, generateIndividualTableChartImage } from '@/lib/individualTableChartEngine';

interface IndividualTableChartExporterProps {
  settings: IndividualChartSettings;
  table: TableWithGuestCount;
  guests: Guest[];
  event: any;
  onClose: () => void;
}

export const IndividualTableChartExporter: React.FC<IndividualTableChartExporterProps> = ({
  settings,
  table,
  guests,
  event,
  onClose,
}) => {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'jpg'>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let blob: Blob;
      let filename: string;
      
      // Create formatted filename: "Event Name-Table X-Seating Chart-DD-MM-YYYY"
      const currentDate = new Date();
      const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getFullYear()}`;
      const eventName = event?.name || 'Event';
      const baseFilename = `${eventName}-Table ${table.table_no}-Seating Chart-${formattedDate}`;
      
      if (exportFormat === 'pdf') {
        blob = await generateIndividualTableChartPDF(settings, table, guests, event);
        filename = `${baseFilename}.pdf`;
      } else {
        blob = await generateIndividualTableChartImage(settings, table, guests, event, exportFormat);
        filename = `${baseFilename}.${exportFormat}`;
      }
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Export Individual Table Chart
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Format Selection */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select value={exportFormat} onValueChange={(value: 'pdf' | 'png' | 'jpg') => setExportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        PDF (Recommended for printing)
                      </div>
                    </SelectItem>
                    <SelectItem value="png">
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        PNG (High quality image)
                      </div>
                    </SelectItem>
                    <SelectItem value="jpg">
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        JPG (Smaller file size)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export Details */}
              <div className="text-sm text-muted-foreground">
                <p><strong>Table:</strong> {table.name} (Table {table.table_no})</p>
                <p><strong>Guests:</strong> {guests.filter(g => g.table_id === table.id).length} of {table.limit_seats}</p>
                <p><strong>Size:</strong> {settings.paperSize}</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};