import { Button } from '@/components/ui/button';
import { Printer, Download, Mail, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { TemplateType } from '@/hooks/useDJQuestionnaire';
import { QUESTIONNAIRE_TEMPLATES, getTemplateLabel } from './questionnaireTemplates';

interface QuestionnaireActionButtonsProps {
  eventName?: string;
  templateType: TemplateType;
  responses: Record<string, any>;
}

export const QuestionnaireActionButtons = ({
  eventName = 'Event',
  templateType,
  responses,
}: QuestionnaireActionButtonsProps) => {
  const { toast } = useToast();

  const handlePrint = () => {
    window.print();
    toast({
      title: "Print",
      description: "Opening print dialog...",
    });
  };

  const handleDownloadPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = margin;

      // Header
      pdf.setFontSize(20);
      pdf.text('DJ & MC Questionnaire', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text(getTemplateLabel(templateType), margin, yPosition);
      yPosition += 7;
      pdf.text(`Event: ${eventName}`, margin, yPosition);
      yPosition += 15;

      // Questions and Answers
      const questions = QUESTIONNAIRE_TEMPLATES[templateType];
      pdf.setFontSize(10);

      questions.forEach((question) => {
        const answer = responses[question.id] || 'Not provided';

        // Question
        pdf.setFont(undefined, 'bold');
        pdf.text(question.label, margin, yPosition);
        yPosition += 5;

        // Answer
        pdf.setFont(undefined, 'normal');
        const answerLines = pdf.splitTextToSize(answer, pageWidth - 2 * margin);
        pdf.text(answerLines, margin, yPosition);
        yPosition += answerLines.length * 5 + 5;

        // Page break if needed
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = margin;
        }
      });

      pdf.save(`${eventName}-dj-questionnaire.pdf`);
      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = () => {
    toast({
      title: "Coming Soon",
      description: "Email functionality will be available soon",
    });
  };

  const handleSendSMS = () => {
    toast({
      title: "Coming Soon",
      description: "SMS functionality will be available soon",
    });
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        style={{ borderColor: '#6D28D9', color: '#6D28D9' }}
      >
        <Printer className="w-4 h-4 mr-2" />
        Print
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadPDF}
        style={{ borderColor: '#6D28D9', color: '#6D28D9' }}
      >
        <Download className="w-4 h-4 mr-2" />
        Download PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSendEmail}
        style={{ borderColor: '#6D28D9', color: '#6D28D9' }}
      >
        <Mail className="w-4 h-4 mr-2" />
        Send Email
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSendSMS}
        style={{ borderColor: '#6D28D9', color: '#6D28D9' }}
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Send SMS
      </Button>
    </div>
  );
};
