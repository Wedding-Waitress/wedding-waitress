import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { Download, Printer, Eye, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const [fileType, setFileType] = useState<'pdf' | 'png' | 'jpeg'>('pdf');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePreviewPage = () => {
    onPageFocus(selectedPage);
    const pageElement = document.querySelector(`[data-page="${selectedPage}"]`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handlePreviewAll = () => {
    onPageFocus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const capturePageAsCanvas = async (pageIndex: number): Promise<HTMLCanvasElement> => {
    const pageElement = document.querySelector(`[data-page="${pageIndex}"]`) as HTMLElement;
    if (!pageElement) {
      throw new Error(`Page ${pageIndex} not found`);
    }

    // Set exporting state to hide fold guides
    onExportStateChange(true);

    // Wait for next frame to ensure styles are applied
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Capture at 300 DPI (A4 = 2480 × 3508 px)
    const canvas = await html2canvas(pageElement, {
      scale: 5.9, // 420px width * 5.9 ≈ 2480px for 300 DPI
      backgroundColor: '#FFFFFF',
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: 420,
      height: Math.floor(420 * (297 / 210)), // A4 aspect ratio
    });

    onExportStateChange(false);
    return canvas;
  };

  const handleDownloadPage = async () => {
    setIsProcessing(true);
    try {
      const canvas = await capturePageAsCanvas(selectedPage);

      if (fileType === 'pdf') {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        pdf.save(`${event.name}-place-cards-page-${selectedPage + 1}.pdf`);
      } else {
        const mimeType = fileType === 'png' ? 'image/png' : 'image/jpeg';
        const link = document.createElement('a');
        link.download = `${event.name}-place-cards-page-${selectedPage + 1}.${fileType}`;
        link.href = canvas.toDataURL(mimeType, 1.0);
        link.click();
      }

      toast({
        title: "Success",
        description: `Page ${selectedPage + 1} downloaded successfully`,
      });
    } catch (error) {
      console.error('Error downloading page:', error);
      toast({
        title: "Error",
        description: "Failed to download page",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsProcessing(true);
    try {
      if (fileType === 'pdf') {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        for (let i = 0; i < totalPages; i++) {
          const canvas = await capturePageAsCanvas(i);
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          
          if (i > 0) {
            pdf.addPage();
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        }

        pdf.save(`${event.name}-place-cards-all.pdf`);
      } else {
        // For PNG/JPEG, create a zip would be ideal, but for now download individually
        for (let i = 0; i < totalPages; i++) {
          const canvas = await capturePageAsCanvas(i);
          const mimeType = fileType === 'png' ? 'image/png' : 'image/jpeg';
          const link = document.createElement('a');
          link.download = `${event.name}-place-cards-page-${i + 1}.${fileType}`;
          link.href = canvas.toDataURL(mimeType, 1.0);
          link.click();
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast({
        title: "Success",
        description: `All ${totalPages} pages downloaded successfully`,
      });
    } catch (error) {
      console.error('Error downloading all pages:', error);
      toast({
        title: "Error",
        description: "Failed to download all pages",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintPage = () => {
    const pageElement = document.querySelector(`[data-page="${selectedPage}"]`) as HTMLElement;
    if (!pageElement) {
      toast({
        title: "Error",
        description: "Page not found",
        variant: "destructive",
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Unable to open print window",
        variant: "destructive",
      });
      return;
    }

    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Place Cards - Page ${selectedPage + 1}</title>
          <style>
            ${styles}
            body { margin: 0; padding: 0; }
            @page { size: A4 portrait; margin: 0; }
            .fold-guide { display: none !important; }
          </style>
        </head>
        <body>
          ${pageElement.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handlePrintAll = () => {
    const allPages = Array.from(document.querySelectorAll('[data-page]'));
    if (!allPages.length) {
      toast({
        title: "Error",
        description: "No pages found",
        variant: "destructive",
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Unable to open print window",
        variant: "destructive",
      });
      return;
    }

    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');

    const pagesHtml = allPages
      .map((page, index) => `
        <div style="page-break-after: ${index < allPages.length - 1 ? 'always' : 'auto'};">
          ${page.innerHTML}
        </div>
      `)
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Place Cards - All Pages</title>
          <style>
            ${styles}
            body { margin: 0; padding: 0; }
            @page { size: A4 portrait; margin: 0; }
            .fold-guide { display: none !important; }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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

        {/* File Type Selector */}
        <div className="space-y-2">
          <Label>Export Format</Label>
          <RadioGroup value={fileType} onValueChange={(value: any) => setFileType(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="pdf" />
              <Label htmlFor="pdf" className="font-normal cursor-pointer">PDF (Recommended)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="png" id="png" />
              <Label htmlFor="png" className="font-normal cursor-pointer">PNG (High Quality)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="jpeg" id="jpeg" />
              <Label htmlFor="jpeg" className="font-normal cursor-pointer">JPEG (Smaller Size)</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Preview Controls */}
        <div className="space-y-2">
          <Label>Preview Controls</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewPage}
              disabled={isProcessing}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Page
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewAll}
              disabled={isProcessing}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview All
            </Button>
          </div>
        </div>

        {/* Download Controls */}
        <div className="space-y-2">
          <Label>Download Controls</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPage}
              disabled={isProcessing}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Page
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              disabled={isProcessing}
            >
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>
        </div>

        {/* Print Controls */}
        <div className="space-y-2">
          <Label>Print Controls</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintPage}
              disabled={isProcessing}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Page
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintAll}
              disabled={isProcessing}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print All
            </Button>
          </div>
        </div>

        {/* Export Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>• All exports are 300 DPI for professional quality</p>
          <p>• PDF exports maintain exact A4 dimensions (210×297mm)</p>
          <p>• Image exports are 2480×3508 pixels (A4 @ 300 DPI)</p>
        </div>
      </CardContent>
    </Card>
  );
};