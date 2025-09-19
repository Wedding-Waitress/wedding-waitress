import React, { useState } from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PlaceCardExporterProps {
  settings: PlaceCardSettings | null;
  guests: Guest[];
  event: any;
}

interface PlaceCardData {
  guest: Guest;
  message: string;
  tableInfo: string;
}

export const PlaceCardExporter: React.FC<PlaceCardExporterProps> = ({
  settings,
  guests,
  event
}) => {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const currentSettings = settings || {
    event_id: '',
    user_id: '',
    font_family: 'Inter',
    font_color: '#000000',
    background_color: '#ffffff',
    background_image_url: null,
    background_image_type: 'none' as const,
    mass_message: '',
    individual_messages: {},
  };

  const generatePlaceCardData = (): PlaceCardData[] => {
    return guests.map(guest => {
      const tableInfo = guest.table_no && guest.seat_no 
        ? `Table ${guest.table_no}, Seat ${guest.seat_no}`
        : 'Unassigned';
      
      const individualMessage = currentSettings.individual_messages[guest.id];
      const message = individualMessage || currentSettings.mass_message || '';

      return {
        guest,
        message,
        tableInfo
      };
    });
  };

  const createPlaceCardHTML = (cardData: PlaceCardData): string => {
    const { guest, message, tableInfo } = cardData;
    
    return `
      <div style="
        width: 100mm;
        height: 60mm;
        background-color: ${currentSettings.background_color};
        font-family: ${currentSettings.font_family};
        color: ${currentSettings.font_color};
        border: 1px solid #ddd;
        border-radius: 8px;
        position: relative;
        overflow: hidden;
        page-break-inside: avoid;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
        padding: 8mm;
        box-sizing: border-box;
        ${currentSettings.background_image_url && currentSettings.background_image_type === 'full' 
          ? `background-image: url(${currentSettings.background_image_url}); background-size: cover; background-position: center; background-blend-mode: overlay;`
          : ''
        }
      ">
        ${currentSettings.background_image_url && currentSettings.background_image_type === 'decorative' 
          ? `<div style="position: absolute; top: 4mm; right: 4mm; width: 8mm; height: 8mm;">
               <img src="${currentSettings.background_image_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 2px;" />
             </div>`
          : ''
        }
        
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 4mm; line-height: 1.2;">
          ${guest.first_name} ${guest.last_name}
        </div>
        
        <div style="font-size: 12px; margin-bottom: 6mm; opacity: 0.8;">
          ${tableInfo}
        </div>
        
        ${message ? `
          <div style="font-size: 10px; line-height: 1.4; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 4mm; margin-top: auto; opacity: 0.7;">
            ${message}
          </div>
        ` : ''}
        
        <!-- Fold line indicator -->
        <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 12mm; height: 1px; background-color: rgba(0,0,0,0.3);"></div>
      </div>
    `;
  };

  const generatePDF = async () => {
    if (!guests.length) {
      toast({
        title: "Error",
        description: "No assigned guests found to export",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const placeCards = generatePlaceCardData();
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // A4 dimensions: 210mm x 297mm
      const pageWidth = 210;
      const pageHeight = 297;
      const cardWidth = 100;
      const cardHeight = 60;
      const margin = 5;
      
      // Calculate positions for 6 cards in 3x2 grid layout
      const positions = [
        { x: margin, y: margin + 30 },
        { x: margin + cardWidth + margin, y: margin + 30 },
        { x: pageWidth - cardWidth - margin, y: margin + 30 },
        { x: margin, y: pageHeight - cardHeight - margin - 30 },
        { x: margin + cardWidth + margin, y: pageHeight - cardHeight - margin - 30 },
        { x: pageWidth - cardWidth - margin, y: pageHeight - cardHeight - margin - 30 }
      ];

      let pageIndex = 0;

      for (let i = 0; i < placeCards.length; i += 6) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        // Add page title
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`${event?.name || 'Event'} - Place Cards (Page ${pageIndex + 1})`, pageWidth / 2, 15, { align: 'center' });

        // Add cutting guides
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        
        // Corner marks
        pdf.line(5, 5, 10, 5);
        pdf.line(5, 5, 5, 10);
        pdf.line(pageWidth - 10, 5, pageWidth - 5, 5);
        pdf.line(pageWidth - 5, 5, pageWidth - 5, 10);
        pdf.line(5, pageHeight - 10, 5, pageHeight - 5);
        pdf.line(5, pageHeight - 5, 10, pageHeight - 5);
        pdf.line(pageWidth - 5, pageHeight - 10, pageWidth - 5, pageHeight - 5);
        pdf.line(pageWidth - 10, pageHeight - 5, pageWidth - 5, pageHeight - 5);

        // Process up to 6 cards for this page
        const pageCards = placeCards.slice(i, i + 6);
        
        for (let j = 0; j < pageCards.length; j++) {
          const cardData = pageCards[j];
          const position = positions[j];
          
          // Create temporary HTML element for the card
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = createPlaceCardHTML(cardData);
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.top = '-9999px';
          document.body.appendChild(tempDiv);

          try {
            // Convert HTML to canvas
            const canvas = await html2canvas(tempDiv.firstElementChild as HTMLElement, {
              width: cardWidth * 3.78, // Convert mm to pixels (96 DPI)
              height: cardHeight * 3.78,
              scale: 2,
              useCORS: true,
              allowTaint: true,
            });

            // Add card to PDF at calculated position
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', position.x, position.y, cardWidth, cardHeight);

          } finally {
            document.body.removeChild(tempDiv);
          }
        }

        pageIndex++;
      }

      // Save the PDF
      const fileName = `${event?.name || 'Event'}_Place_Cards.pdf`;
      pdf.save(fileName);

      toast({
        title: "Success",
        description: `PDF exported successfully: ${fileName}`,
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (!guests.length) {
    return null; // Don't render anything if no guests
  }

  return (
    <div className="space-y-3">
      <Button 
        onClick={generatePDF}
        disabled={exporting}
        variant="gradient"
        className="w-full"
        size="lg"
      >
        {exporting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Print Name Place Cards
          </>
        )}
      </Button>

      <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
        <strong>Print Instructions:</strong>
        <ul className="mt-1 space-y-1 list-disc list-inside">
          <li>Print on A4 paper (210mm × 297mm)</li>
          <li>Use cardstock (200-300gsm) for best results</li>
          <li>Cut along the dashed guides</li>
          <li>Fold along the bottom line for standing cards</li>
        </ul>
      </div>
    </div>
  );
};