import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, FileDown, FileText, Mail, MessageSquare, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DJQuestionnaireWithData, TemplateType } from '@/types/djQuestionnaire';
import { Event } from '@/lib/djQuestionnaireFormatters';
import { exportToDocx } from '@/lib/djQuestionnaireDocxExporter';
import { HeaderOverridesModal } from './HeaderOverridesModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
        description: 'This may take a moment...',
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Capture header
      const headerElement = document.getElementById('questionnaire-header');
      if (headerElement) {
        const headerCanvas = await html2canvas(headerElement, { scale: 2 });
        const headerImgData = headerCanvas.toDataURL('image/png');
        const headerHeight = (headerCanvas.height * 210) / headerCanvas.width;
        pdf.addImage(headerImgData, 'PNG', 0, 0, 210, headerHeight);
      }

      // Capture form
      const formElement = document.getElementById('questionnaire-form');
      if (formElement) {
        const formCanvas = await html2canvas(formElement, { scale: 2 });
        const formImgData = formCanvas.toDataURL('image/png');
        const formHeight = (formCanvas.height * 210) / formCanvas.width;
        
        // Add form on new page if needed
        if (formHeight > 250) {
          pdf.addPage();
          pdf.addImage(formImgData, 'PNG', 0, 0, 210, Math.min(formHeight, 297));
        } else {
          pdf.addImage(formImgData, 'PNG', 0, 60, 210, formHeight);
        }
      }

      const eventName = event.partner1_name && event.partner2_name
        ? `${event.partner1_name}_${event.partner2_name}`
        : event.name;
      pdf.save(`${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_DJ_Questionnaire.pdf`);

      toast({
        title: 'PDF Downloaded',
        description: 'Your questionnaire has been saved',
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
      description: 'Email delivery will be available soon',
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
