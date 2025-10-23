import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, FileDown, FileText, Mail, MessageSquare, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DJQuestionnaireWithData, TemplateType } from '@/types/djQuestionnaire';
import { Event, formatEventDate, getEventName, getTemplateDisplayLabel, formatTimeRange } from '@/lib/djQuestionnaireFormatters';
import { exportToDocx } from '@/lib/djQuestionnaireDocxExporter';
import { HeaderOverridesModal } from './HeaderOverridesModal';
import jsPDF from 'jspdf';
import { validateMusicURL, getPlatformName, ensureAbsoluteUrl } from '@/lib/urlValidation';

interface QuestionnaireActionButtonsProps {
  event: Event;
  questionnaire: DJQuestionnaireWithData;
  templateType: TemplateType;
  onUpdateHeaderOverrides: (overrides: Record<string, any>) => Promise<void>;
}

export const QuestionnaireActionButtons = ({
  event,
  questionnaire,
  templateType,
  onUpdateHeaderOverrides,
}: QuestionnaireActionButtonsProps) => {
  const { toast } = useToast();
  const [showHeaderModal, setShowHeaderModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handlePrint = () => {
    toast({
      title: 'Opening Print Dialog',
      description: 'Preparing questionnaire for printing...',
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating document with clickable links...',
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      let yPos = 20;
      const leftMargin = 20;
      const pageWidth = 170;

      // Header
      pdf.setFontSize(24);
      pdf.setTextColor(109, 40, 217);
      pdf.setFont('helvetica', 'bold');
      const eventName = getEventName(event);
      pdf.text(eventName, leftMargin, yPos);
      yPos += 10;

      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      const templateLabel = getTemplateDisplayLabel(templateType);
      const fullDate = formatEventDate(event.date);
      pdf.text(`${templateLabel} – ${fullDate}`, leftMargin, yPos);
      yPos += 8;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const headerOverrides = (questionnaire.header_overrides as Record<string, any>) || {};
      const venue = headerOverrides.venue_override || event.venue_name || event.venue || 'Venue TBD';
      pdf.text(`Venue: ${venue}`, leftMargin, yPos);
      yPos += 5;
      
      const djName = headerOverrides.dj_name || 'TBD';
      const mcName = headerOverrides.mc_name || 'TBD';
      pdf.text(`DJ: ${djName} — MC: ${mcName}`, leftMargin, yPos);
      yPos += 10;

      // Sections
      questionnaire.sections.forEach((section) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFontSize(16);
        pdf.setTextColor(109, 40, 217);
        pdf.setFont('helvetica', 'bold');
        pdf.text(section.label, leftMargin, yPos);
        yPos += 8;

        if (section.instructions) {
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          pdf.setFont('helvetica', 'italic');
          const instructionLines = pdf.splitTextToSize(section.instructions, pageWidth);
          pdf.text(instructionLines, leftMargin, yPos);
          yPos += instructionLines.length * 5 + 3;
        }

        section.items.forEach((item) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }

          const answerValue = item.answer?.value;

          if (item.type === 'song_row' && answerValue) {
            pdf.setFontSize(11);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'bold');
            
            const songData = answerValue;
            const songText = `♪ ${songData.song || '[No title]'} – ${songData.artist || '[No artist]'}`;
            pdf.text(songText, leftMargin + 5, yPos);
            yPos += 6;

            if (songData.link) {
              const linkUrl = ensureAbsoluteUrl(songData.link);
              const validation = validateMusicURL(linkUrl);
              const platformName = getPlatformName(validation.platform);
              
              pdf.setFontSize(10);
              pdf.setTextColor(109, 40, 217);
              pdf.setFont('helvetica', 'normal');
              
              pdf.textWithLink(`🔗 ${platformName}: ${linkUrl}`, leftMargin + 10, yPos, {
                url: linkUrl,
              });
              yPos += 6;
            }

            yPos += 3;
          } else {
            pdf.setFontSize(11);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'bold');
            pdf.text(item.prompt, leftMargin, yPos);
            yPos += 6;

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            let displayValue = '';
            if (answerValue !== null && answerValue !== undefined) {
              if (typeof answerValue === 'boolean') {
                displayValue = answerValue ? 'Yes' : 'No';
              } else if (typeof answerValue === 'object') {
                displayValue = JSON.stringify(answerValue);
              } else {
                displayValue = String(answerValue);
              }
            }
            const answerLines = pdf.splitTextToSize(displayValue || '___', pageWidth - 10);
            pdf.text(answerLines, leftMargin + 5, yPos);
            yPos += answerLines.length * 5 + 3;
          }
        });

        yPos += 5;
      });

      pdf.save(`${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_DJ_Questionnaire.pdf`);

      toast({
        title: 'PDF Downloaded',
        description: 'Links are clickable in the PDF',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadDocx = async () => {
    setExporting(true);
    try {
      toast({
        title: 'Generating Word Document',
        description: 'This may take a moment...',
      });

      await exportToDocx(event, questionnaire, templateType);

      toast({
        title: 'Word Document Downloaded',
        description: 'Your questionnaire has been saved',
      });
    } catch (error) {
      console.error('DOCX export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate Word document',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleSendEmail = () => {
    toast({
      title: 'Coming Soon',
      description: 'Email delivery will preserve all clickable links',
    });
  };

  const handleSendSMS = () => {
    toast({
      title: 'Coming Soon',
      description: 'SMS delivery will be available soon',
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowHeaderModal(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Edit Header
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={exporting}>
          <FileDown className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadDocx} disabled={exporting}>
          <FileText className="w-4 h-4 mr-2" />
          Download Word
        </Button>
        <Button variant="outline" size="sm" onClick={handleSendEmail}>
          <Mail className="w-4 h-4 mr-2" />
          Send Email
        </Button>
        <Button variant="outline" size="sm" onClick={handleSendSMS}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Send SMS
        </Button>
      </div>

      <HeaderOverridesModal
        open={showHeaderModal}
        onOpenChange={setShowHeaderModal}
        currentOverrides={questionnaire.header_overrides as Record<string, any>}
        onSave={onUpdateHeaderOverrides}
      />
    </>
  );
};
