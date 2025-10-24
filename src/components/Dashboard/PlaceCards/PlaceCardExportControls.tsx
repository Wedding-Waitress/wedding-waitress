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
import { Eye, FileDown, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportPlaceCardPageToDocx, exportAllPlaceCardsToDocx } from '@/lib/placeCardsDocxExporter';

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

  const openPrintPreview = (pageIndexes: number[]) => {
    // Get the page elements
    const pageElements = pageIndexes.map(i => 
      document.querySelector(`[data-page="${i}"]`) as HTMLElement
    ).filter(Boolean);

    if (!pageElements.length) {
      toast({
        title: "Error",
        description: "Pages not found",
        variant: "destructive",
      });
      return;
    }

    // Open new window
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      toast({
        title: "Error",
        description: "Please allow pop-ups to preview pages",
        variant: "destructive",
      });
      return;
    }

    // Clone pages and build HTML document
    const clonedPages = pageElements.map(page => page.cloneNode(true) as HTMLElement);
    const pagesHtml = clonedPages.map(page => page.outerHTML).join('');

    // Write complete HTML document with comprehensive styles
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${event.name} - Place Cards Preview</title>
        <style>
          @page { 
            size: A4 portrait; 
            margin: 1.27cm; 
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          
          html, body {
            background: #FFFFFF;
            font-family: system-ui, -apple-system, sans-serif;
          }
          
          /* A4 page container */
          .place-card-preview-container {
            width: 210mm;
            height: 297mm;
            background: #FFFFFF;
            page-break-after: always;
            page-break-inside: avoid;
            margin: 20px auto;
            padding: 1.27cm;
            box-sizing: border-box;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            position: relative;
          }
          
          /* A4 page content with explicit grid - adjusted for margins */
          .place-card-a4-page {
            width: calc(210mm - 2.54cm);
            height: calc(297mm - 2.54cm);
            background: #FFFFFF;
            position: relative;
            display: grid !important;
            grid-template-columns: repeat(2, calc((210mm - 2.54cm) / 2)) !important;
            grid-template-rows: repeat(3, calc((297mm - 2.54cm) / 3)) !important;
            gap: 0 !important;
          }
          
          /* Place card cells - adjusted for margins */
          .place-card-cell {
            width: calc((210mm - 2.54cm) / 2) !important;
            height: calc((297mm - 2.54cm) / 3) !important;
            page-break-inside: avoid;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            text-align: center;
            padding: 8mm;
            overflow: visible;
          }
          
          /* Card content positioned in lower half (below fold) */
          .card-content {
            position: absolute;
            left: 8mm;
            right: 8mm;
            top: 70%;
            transform: translateY(-50%);
            text-align: center;
          }
          
          /* Move text down when full background image is present */
          .card-content.has-full-background {
            top: 82%;
          }
          
          /* Split layout when decorative image exists */
          .card-content.has-decorative-image {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4mm;
            left: 6mm;
            right: 6mm;
          }
          
          .card-content.has-decorative-image .guest-name,
          .card-content.has-decorative-image .table-info {
            text-align: left;
          }
          
          /* Text container takes left side when decorative image exists */
          .card-content.has-decorative-image > div:first-child {
            flex: 0 0 55%;
            text-align: left;
          }
          
          /* Large decorative image on right side */
          .decorative-image-container {
            flex: 0 0 40%;
            display: flex;
            align-items: center;
            justify-content: center;
            max-height: 35mm;
          }
          
          .decorative-image {
            width: 100%;
            height: 100%;
            max-height: 35mm;
            object-fit: contain;
            border: none;
            border-radius: 4px;
          }
          
          /* Background Image */
          .place-card-background {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            top: 55%;
            pointer-events: none;
            background-repeat: no-repeat;
            background-size: 100% auto;
          }
          
          /* Guest name styles */
          .guest-name {
            line-height: 1.1;
            text-align: center;
            overflow: visible;
            font-weight: 400;
            font-synthesis: weight;
          }
          
          /* Table info styles */
          .table-info {
            font-weight: 400;
            margin-top: 2mm;
          }
          
          /* Folded message section - top half of card, upside down */
          .folded-message-section {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 49.5mm;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding: 8mm 12mm;
            padding-bottom: 20mm;
            transform: rotate(180deg);
          }

          .folded-message-text {
            font-size: 11pt;
            line-height: 1.4;
            text-align: center;
            max-width: 100%;
          }
          
          /* Card back for messages */
          .card-back {
            position: relative;
            width: 100%;
            height: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
          }
          
          .message-text {
            font-size: 10pt;
            opacity: 0.7;
            line-height: 1.3;
            max-width: 90%;
          }
          
          /* Cut lines */
          .cutline-v, .cutline-h1, .cutline-h2 {
            position: absolute;
            border-color: rgba(217, 217, 217, 0.6);
          }
          
          .cutline-v {
            left: 50%;
            top: 0;
            bottom: 0;
            width: 1px;
            border-left: 1px solid rgba(150, 150, 150, 0.5);
            z-index: 10;
            transform: translateX(-0.5px);
          }
          
          .cutline-h1 {
            left: 0;
            right: 0;
            top: 33.333%;
            height: 0;
            border-top: 0.5px solid rgba(217, 217, 217, 0.6);
            z-index: 1;
          }
          
          .cutline-h2 {
            left: 0;
            right: 0;
            top: 66.666%;
            height: 0;
            border-top: 0.5px solid rgba(217, 217, 217, 0.6);
            z-index: 1;
          }
          
          /* Utility classes */
          .grid-cols-2 {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          
          /* Print-specific styles */
          @media print {
            body { 
              margin: 0; 
            }
            
            .place-card-preview-container {
              margin: 0;
              box-shadow: none;
              page-break-after: always;
            }
            
            .place-card-a4-page {
              width: 210mm;
              height: 297mm;
              display: grid !important;
              grid-template-columns: repeat(2, 105mm) !important;
              grid-template-rows: repeat(3, 99mm) !important;
              gap: 0 !important;
            }
            
            .place-card-cell {
              width: 105mm !important;
              height: 99mm !important;
            }
            
            .cutline-v {
              left: 105mm !important;
              transform: translateX(-0.5px) !important;
            }
            
            .cutline-h1 {
              top: 99mm !important;
            }
            
            .cutline-h2 {
              top: 198mm !important;
            }
            
      .decorative-image {
        border: none;
      }
      
      /* Folded message section - top half of card, upside down */
      #temp-capture-container .folded-message-section {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 49.5mm;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 8mm 12mm;
        padding-bottom: 20mm;
        transform: rotate(180deg);
      }

      #temp-capture-container .folded-message-text {
        font-size: 11pt;
        line-height: 1.4;
        text-align: center;
        max-width: 100%;
      }
            
            .folded-message-text {
              font-size: 11pt;
            }
            
            .table-info {
              font-weight: 700;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `);
    previewWindow.document.close();
  };

  const handlePreviewPage = () => {
    openPrintPreview([selectedPage]);
  };

  const handlePreviewAll = () => {
    openPrintPreview(Array.from({ length: totalPages }, (_, i) => i));
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