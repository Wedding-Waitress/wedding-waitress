import { Button } from '@/components/ui/button';
import { Printer, Download, Mail, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TemplateType } from '@/types/djQuestionnaire';
import { getTemplateLabel } from '@/lib/djQuestionnaireTemplates';

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
    toast({
      title: "Coming Soon",
      description: "PDF download will be available soon",
    });
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
