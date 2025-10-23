import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Printer, FileDown, FileText, Mail, MessageSquare, Settings, CheckCircle, Copy, ExternalLink, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { DJQuestionnaireWithData, TemplateType } from '@/types/djQuestionnaire';
import { Event, formatEventDate, getEventName, getTemplateDisplayLabel, formatTimeRange } from '@/lib/djQuestionnaireFormatters';
import { exportToDocx } from '@/lib/djQuestionnaireDocxExporter';
import { HeaderOverridesModal } from './HeaderOverridesModal';
import jsPDF from 'jspdf';
import { validateMusicURL, getPlatformName, ensureAbsoluteUrl } from '@/lib/urlValidation';
import { buildDJQuestionnaireUrl } from '@/lib/urlUtils';

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
  const { emailEnabled, smsEnabled } = useNotificationSettings();
  const [showHeaderModal, setShowHeaderModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const publicUrl = questionnaire.share_token 
    ? buildDJQuestionnaireUrl(questionnaire.share_token)
    : null;

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      toast({
        title: 'Link Copied',
        description: 'Public questionnaire link copied to clipboard',
      });
    }
  };

  const handleOpenLink = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

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
      
      // Format times
      const ceremonyTime = formatTimeRange(
        headerOverrides.ceremony_start || event.start_time,
        headerOverrides.ceremony_finish || event.start_time
      );
      const canapesTime = formatTimeRange(
        headerOverrides.canapes_start || null,
        headerOverrides.canapes_finish || null
      );
      const receptionTime = formatTimeRange(
        headerOverrides.reception_start || event.start_time,
        headerOverrides.reception_finish || event.finish_time
      );
      
      // Ceremony time
      pdf.text(`Ceremony: ${ceremonyTime}`, leftMargin, yPos);
      yPos += 5;
      
      // Canapés time (only if set)
      if (canapesTime && canapesTime !== 'TBD') {
        pdf.text(`Canapés: ${canapesTime}`, leftMargin, yPos);
        yPos += 5;
      }
      
      // Reception time
      pdf.text(`Reception: ${receptionTime}`, leftMargin, yPos);
      yPos += 5;
      
      // DJ & MC details
      const djName = headerOverrides.dj_name || 'TBD';
      const djMobile = headerOverrides.dj_mobile || 'TBD';
      const mcName = headerOverrides.mc_name || 'TBD';
      const mcMobile = headerOverrides.mc_mobile || 'TBD';
      pdf.text(`DJ: ${djName}, ${djMobile} — MC: ${mcName}, ${mcMobile}`, leftMargin, yPos);
      yPos += 8;

      // Metadata
      const now = new Date();
      const generatedDate = now.toLocaleDateString();
      const generatedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'italic');
      // We'll update page count at the end
      const metadataY = yPos;
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

      // Add metadata at the end of first page
      const totalPages = pdf.internal.pages.length - 1; // Subtract 1 for the initial blank page
      pdf.setPage(1);
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Pages: ${totalPages} — Generated on: ${generatedDate} — Time: ${generatedTime}`, leftMargin, metadataY);

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
    <div className="space-y-4">
      {/* Approval Status */}
      {questionnaire.status === 'approved' && questionnaire.approved_at && (
        <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
          <CheckCircle className="w-5 h-5 text-success" />
          <div className="flex-1">
            <div className="font-medium text-success">Questionnaire Approved</div>
            <div className="text-sm text-muted-foreground">
              Acknowledged on {new Date(questionnaire.approved_at).toLocaleString()}
              {questionnaire.approved_by_name && ` by ${questionnaire.approved_by_name}`}
            </div>
          </div>
        </div>
      )}

      {/* Public Link Section */}
      {publicUrl && (
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h4 className="font-medium text-sm mb-1">Public Review Link</h4>
              <p className="text-xs text-muted-foreground">
                Share this link with vendors for read-only access and acknowledgment
              </p>
            </div>
            <Badge variant={questionnaire.status === 'approved' ? 'default' : 'secondary'}>
              {questionnaire.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background px-3 py-2 rounded border truncate">
              {publicUrl}
            </code>
            <Button onClick={handleCopyLink} variant="outline" size="sm">
              <Copy className="w-4 h-4" />
            </Button>
            <Button onClick={handleOpenLink} variant="outline" size="sm">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Desktop: Full Button Row */}
      <div className="hidden lg:flex flex-wrap gap-2">
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
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSendEmail}
                  disabled={!emailEnabled}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </span>
            </TooltipTrigger>
            {!emailEnabled && (
              <TooltipContent>
                <p>Configure email in Settings to enable sending</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSendSMS}
                  disabled={!smsEnabled}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send SMS
                </Button>
              </span>
            </TooltipTrigger>
            {!smsEnabled && (
              <TooltipContent>
                <p>Configure SMS in Settings to enable sending</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Mobile: Hamburger Menu */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Menu className="w-4 h-4 mr-2" />
              Actions
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Questionnaire Actions</SheetTitle>
            </SheetHeader>
            <div className="grid gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowHeaderModal(true)} className="justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Edit Header
              </Button>
              <Button variant="outline" onClick={handlePrint} className="justify-start">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF} disabled={exporting} className="justify-start">
                <FileDown className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleDownloadDocx} disabled={exporting} className="justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Download Word
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button 
                        variant="outline" 
                        onClick={handleSendEmail}
                        disabled={!emailEnabled}
                        className="w-full justify-start"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                        {!emailEnabled && <span className="ml-auto text-xs text-muted-foreground">(Configure in Settings)</span>}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!emailEnabled && (
                    <TooltipContent>
                      <p>Configure email in Settings to enable sending</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button 
                        variant="outline" 
                        onClick={handleSendSMS}
                        disabled={!smsEnabled}
                        className="w-full justify-start"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send SMS
                        {!smsEnabled && <span className="ml-auto text-xs text-muted-foreground">(Configure in Settings)</span>}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!smsEnabled && (
                    <TooltipContent>
                      <p>Configure SMS in Settings to enable sending</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <HeaderOverridesModal
        open={showHeaderModal}
        onOpenChange={setShowHeaderModal}
        currentOverrides={questionnaire.header_overrides as Record<string, any>}
        onSave={onUpdateHeaderOverrides}
      />
    </div>
  );
};
