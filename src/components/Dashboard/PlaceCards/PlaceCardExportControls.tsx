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
  const fileType = 'pdf'; // Hardcoded to PDF
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
            margin: 0; 
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
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            position: relative;
          }
          
          /* A4 page content with explicit grid */
          .place-card-a4-page {
            width: 210mm;
            height: 297mm;
            background: #FFFFFF;
            position: relative;
          }
          
          /* Grid container - critical for 2x3 layout */
          .place-card-a4-page .grid {
            display: grid !important;
            grid-template-columns: repeat(2, 105mm) !important;
            grid-template-rows: repeat(3, 99mm) !important;
            width: 210mm !important;
            height: 297mm !important;
            gap: 0 !important;
          }
          
          /* Place card cells */
          .place-card-cell {
            width: 105mm !important;
            height: 99mm !important;
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
            top: 67%;
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
            border: 0.5px solid #000000;
            border-radius: 4px;
          }
          
          /* Background Image */
          .place-card-background {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            top: 50%;
            pointer-events: none;
            background-repeat: no-repeat;
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
            }
            
            .place-card-a4-page .grid {
              display: grid !important;
              grid-template-columns: repeat(2, 105mm) !important;
              grid-template-rows: repeat(3, 99mm) !important;
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
              border: 3px solid #000000;
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

  const printWithStyles = (pages: HTMLElement[]) => {
    // Create temporary print container
    const printContainer = document.createElement('div');
    printContainer.id = 'ww-print-container';
    printContainer.style.position = 'fixed';
    printContainer.style.top = '-9999px';
    printContainer.style.left = '-9999px';
    
    // Clone pages with all computed styles preserved
    pages.forEach(page => {
      const clone = page.cloneNode(true) as HTMLElement;
      printContainer.appendChild(clone);
    });
    
    // Add print-specific styles to document
    const printStyles = document.createElement('style');
    printStyles.id = 'ww-print-styles';
    printStyles.textContent = `
      @page { 
        size: A4 portrait; 
        margin: 0; 
      }
      
      @media print {
        :root { color-scheme: light !important; }
        
        html, body {
          background: #FFFFFF !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        /* Hide everything except print container */
        body > *:not(#ww-print-container) {
          display: none !important;
        }
        
        /* Show print container */
        #ww-print-container {
          display: block !important;
          position: static !important;
          top: 0 !important;
          left: 0 !important;
        }
        
        /* Ensure all children are visible */
        #ww-print-container,
        #ww-print-container * {
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* A4 page styling */
        #ww-print-container .place-card-preview-container {
          width: 210mm !important;
          height: 297mm !important;
          background: #FFFFFF !important;
          page-break-after: always !important;
          page-break-inside: avoid !important;
          transform: none !important;
          scale: 1 !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          position: relative !important;
        }
        
        /* Ensure A4 page content is correct */
        #ww-print-container .place-card-a4-page {
          width: 210mm !important;
          height: 297mm !important;
          transform: none !important;
          position: relative !important;
          display: grid !important;
          grid-template-columns: repeat(2, 105mm) !important;
          grid-template-rows: repeat(3, 99mm) !important;
        }
        
        /* Place card cells - exact A4 dimensions */
        #ww-print-container .place-card-cell {
          width: 105mm !important;
          height: 99mm !important;
          page-break-inside: avoid !important;
        }
        
        /* Cut lines - subtle but visible */
        #ww-print-container .cutline-v,
        #ww-print-container .cutline-h1,
        #ww-print-container .cutline-h2 {
          border-color: rgba(217, 217, 217, 0.6) !important;
          opacity: 1 !important;
        }
        
        #ww-print-container .cutline-v {
          left: 105mm !important;
        }
        
        #ww-print-container .cutline-h1 {
          top: 99mm !important;
        }
        
        #ww-print-container .cutline-h2 {
          top: 198mm !important;
        }
        
        /* Hide fold guides and screen-only elements */
        .fold-guide,
        .preview-only,
        .screen-only {
          display: none !important;
        }
        
        /* Preserve colors and backgrounds */
        #ww-print-container * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
    `;
    
    // Append to document
    document.head.appendChild(printStyles);
    document.body.appendChild(printContainer);
    
    // Trigger print after a brief delay to ensure styles are applied
    setTimeout(() => {
      window.print();
      
      // Cleanup after print dialog closes
      // Use both afterprint event and timeout as fallback
      const cleanup = () => {
        if (document.body.contains(printContainer)) {
          document.body.removeChild(printContainer);
        }
        if (document.head.contains(printStyles)) {
          document.head.removeChild(printStyles);
        }
      };
      
      window.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, 1000); // Fallback cleanup
    }, 100);
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

    printWithStyles([pageElement]);
  };

  const handlePrintAll = () => {
    const allPages = Array.from(document.querySelectorAll('[data-page]')) as HTMLElement[];
    if (!allPages.length) {
      toast({
        title: "Error",
        description: "No pages found",
        variant: "destructive",
      });
      return;
    }

    printWithStyles(allPages);
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

      </CardContent>
    </Card>
  );
};