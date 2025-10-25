/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Place Cards feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated 300 DPI export system.
 * 
 * Last completed: 2025-10-04
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { FileDown, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportPlaceCardPageToDocx, exportAllPlaceCardsToDocx } from '@/lib/placeCardsDocxExporter';
import { exportPlaceCardPageToPdf, exportAllPlaceCardsToPdf } from '@/lib/placeCardsPdfExporter';

interface PlaceCardExportControlsProps {
  settings: PlaceCardSettings | null;
  guests: Guest[];
  event: any;
  totalPages: number;
  onPageFocus: (page: number | null) => void;
  onExportStateChange: (isExporting: boolean) => void;
}

export const PlaceCardExportControls: React.FC<PlaceCardExportControlsProps> = ({
  settings,
  guests,
  event,
  totalPages,
  onPageFocus,
  onExportStateChange
}) => {
  const [selectedPage, setSelectedPage] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdfPage = async () => {
    setIsProcessing(true);
    onExportStateChange(true);
    
    try {
      toast({
        title: 'Generating PDF',
        description: `Creating place cards for page ${selectedPage + 1}...`,
      });

      await exportPlaceCardPageToPdf(settings, guests, event, selectedPage);

      toast({
        title: 'PDF Downloaded',
        description: `Page ${selectedPage + 1} has been saved`,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      onExportStateChange(false);
    }
  };

  const handleDownloadPdfAll = async () => {
    setIsProcessing(true);
    onExportStateChange(true);
    
    try {
      toast({
        title: 'Generating PDF',
        description: `Creating place cards for all ${totalPages} pages...`,
      });

      await exportAllPlaceCardsToPdf(settings, guests, event, totalPages);

      toast({
        title: 'PDF Downloaded',
        description: `All ${totalPages} pages have been saved`,
      });
    } catch (error) {
      console.error('PDF export all error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export all pages',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      onExportStateChange(false);
    }
  };

  const handleDownloadWordPage = async () => {
    setIsProcessing(true);
    onExportStateChange(true);
    
    try {
      toast({
        title: 'Generating Word Document',
        description: `Creating place cards for page ${selectedPage + 1}...`,
      });

      await exportPlaceCardPageToDocx(settings, guests, event, selectedPage);

      toast({
        title: 'Word Document Downloaded',
        description: `Page ${selectedPage + 1} has been saved`,
      });
    } catch (error) {
      console.error('DOCX export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate Word document',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      onExportStateChange(false);
    }
  };

  const handleDownloadWordAll = async () => {
    setIsProcessing(true);
    onExportStateChange(true);
    
    try {
      toast({
        title: 'Generating Word Document',
        description: `Creating place cards for all ${totalPages} pages...`,
      });

      await exportAllPlaceCardsToDocx(settings, guests, event, totalPages);

      toast({
        title: 'Word Document Downloaded',
        description: `All ${totalPages} pages have been saved`,
      });
    } catch (error) {
      console.error('DOCX export all error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export all pages',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      onExportStateChange(false);
    }
  };

  return (
    <Card className="ww-box">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Preview, Download & Print
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Page Selector */}
        <div className="space-y-2">
          <Label>Page Selection</Label>
          <Select 
            value={selectedPage.toString()} 
            onValueChange={(value) => setSelectedPage(parseInt(value))}
            disabled={totalPages === 1}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalPages }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  Page {i + 1} of {totalPages}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Export Controls */}
        <div className="space-y-2">
          <Label>Export Controls</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdfPage}
              disabled={isProcessing}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdfAll}
              disabled={isProcessing}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download All PDF
            </Button>
          </div>
        </div>

        {/* Word Export */}
        <div className="space-y-2">
          <Label>Word Export</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadWordPage}
              disabled={isProcessing}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download Word
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadWordAll}
              disabled={isProcessing}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download All Word
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};