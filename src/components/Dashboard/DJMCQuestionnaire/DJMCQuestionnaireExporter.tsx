import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import type { DJMCQuestionnaireWithData } from '@/types/djmcQuestionnaire';
import { format } from 'date-fns';

interface DJMCQuestionnaireExporterProps {
  questionnaire: DJMCQuestionnaireWithData;
  event: { name: string; date?: string | null; venue?: string | null; partner1_name?: string | null; partner2_name?: string | null };
  onClose: () => void;
}

export const DJMCQuestionnaireExporter: React.FC<DJMCQuestionnaireExporterProps> = ({
  questionnaire,
  event,
  onClose,
}) => {
  const handleDownload = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 20;

    // Header
    const eventName = event.partner1_name && event.partner2_name 
      ? `${event.partner1_name} & ${event.partner2_name}'s Wedding`
      : event.name;
    
    pdf.setFontSize(18);
    pdf.setTextColor(114, 72, 230);
    pdf.text(eventName, pageWidth / 2, y, { align: 'center' });
    y += 10;

    pdf.setFontSize(12);
    pdf.setTextColor(100);
    const dateStr = event.date ? format(new Date(event.date), 'EEEE, d MMMM yyyy') : 'Date TBD';
    pdf.text(`DJ & MC Questionnaire — ${dateStr}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Sections
    pdf.setTextColor(0);
    questionnaire.sections.forEach(section => {
      if (y > 260) { pdf.addPage(); y = 20; }
      
      pdf.setFontSize(14);
      pdf.setTextColor(114, 72, 230);
      pdf.text(section.label, 15, y);
      y += 8;
      
      pdf.setFontSize(10);
      pdf.setTextColor(0);
      
      section.items.forEach((item, idx) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        const data = item.data as any;
        let text = `${idx + 1}. `;
        if (data.song_title) text += `${data.song_title} - ${data.artist || ''}`;
        else if (data.names) text += `${data.role}: ${data.names}`;
        else if (data.name) text += `${data.name} (${data.role})`;
        else if (data.song_or_genre) text += data.song_or_genre;
        pdf.text(text.substring(0, 80), 20, y);
        y += 6;
      });
      y += 5;
    });

    pdf.save(`${eventName.replace(/[^a-z0-9]/gi, '_')}_DJ_MC_Questionnaire.pdf`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download PDF</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">Download your DJ & MC Questionnaire as a PDF document.</p>
        <Button onClick={handleDownload} className="w-full mt-4">
          <Download className="w-4 h-4 mr-2" /> Download PDF
        </Button>
      </DialogContent>
    </Dialog>
  );
};
