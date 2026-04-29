import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Download, FileImage, FileText, Layers, Users, Lock, Sparkles, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useGuests } from '@/hooks/useGuests';
import { exportInvitationPNG, exportInvitationPDF, exportInvitation2Up, exportBulkPDF } from '@/lib/invitationExporter';
import { InvitationSendModal } from './InvitationSendModal';
import type { InvitationTemplate, TextZone } from '@/hooks/useInvitationTemplates';
import type { QrConfig } from '@/lib/invitationQR';

interface Props {
  template: InvitationTemplate;
  customText: Record<string, string>;
  customStyles: Record<string, any>;
  eventData: Record<string, string>;
  eventId: string | null;
  qrConfig?: QrConfig;
  qrDataUrl?: string;
}

const FREE_EXPORT_LIMIT = 3;

export const InvitationExporter: React.FC<Props> = ({
  template,
  customText,
  customStyles,
  eventData,
  eventId,
  qrConfig,
  qrDataUrl,
}) => {
  const { toast } = useToast();
  const { plan, isStarterPlan } = useUserPlan();
  const { guests } = useGuests(eventId);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('');
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [exportCount, setExportCount] = useState(0);
  const [showSendModal, setShowSendModal] = useState(false);

  const exportOpts = {
    backgroundUrl: template.background_url,
    orientation: template.orientation,
    widthMm: template.width_mm,
    heightMm: template.height_mm,
    textZones: template.text_zones,
    customText,
    customStyles,
    eventData,
    qrConfig,
    qrDataUrl,
  };

  const checkLimit = (): boolean => {
    if (!isStarterPlan) return true;
    if (exportCount >= FREE_EXPORT_LIMIT) {
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  };

  const handleExport = async (type: 'png' | 'pdf' | '2up' | 'bulk') => {
    if (!checkLimit()) return;
    setExporting(true);
    setExportType(type);
    try {
      switch (type) {
        case 'png':
          await exportInvitationPNG(exportOpts);
          break;
        case 'pdf':
          await exportInvitationPDF(exportOpts);
          break;
        case '2up':
          await exportInvitation2Up(exportOpts);
          break;
        case 'bulk': {
          const attendingGuests = guests.filter(g => g.rsvp === 'Attending' || g.rsvp === 'Pending');
          if (attendingGuests.length === 0) {
            toast({ title: 'No guests', description: 'No guests found for this event.', variant: 'destructive' });
            setExporting(false);
            return;
          }
          setBulkProgress({ current: 0, total: attendingGuests.length });
          await exportBulkPDF(exportOpts, attendingGuests, (current, total) => {
            setBulkProgress({ current, total });
          });
          break;
        }
      }
      setExportCount(prev => prev + 1);
      toast({ title: 'Export complete', description: `Your invitation has been exported as ${type.toUpperCase()}.` });
    } catch (err: any) {
      console.error('Export error:', err);
      toast({ title: 'Export failed', description: err.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setExporting(false);
      setExportType('');
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const hasGuestNameZone = template.text_zones.some(z => z.type === 'guest_name');

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Export & Share
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          {isStarterPlan && (
            <div className="text-xs text-muted-foreground bg-muted rounded-lg p-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>Free plan: {FREE_EXPORT_LIMIT - exportCount} exports remaining</span>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            disabled={exporting}
            onClick={() => handleExport('png')}
          >
            <FileImage className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium">Download PNG</p>
              <p className="text-xs text-muted-foreground">High-res 300 DPI image</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            disabled={exporting}
            onClick={() => handleExport('pdf')}
          >
            <FileText className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium">Download PDF</p>
              <p className="text-xs text-muted-foreground">Single invitation PDF</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            disabled={exporting}
            onClick={() => handleExport('2up')}
          >
            <Layers className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium">Print-Ready A4 (2-up)</p>
              <p className="text-xs text-muted-foreground">Two A5 invitations per A4 page with crop marks</p>
            </div>
          </Button>

          {hasGuestNameZone && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              disabled={exporting || !eventId}
              onClick={() => handleExport('bulk')}
            >
              <Users className="w-4 h-4 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">Bulk Export (Per Guest)</p>
                <p className="text-xs text-muted-foreground">
                  {guests.length} guest{guests.length !== 1 ? 's' : ''} — multi-page PDF
                </p>
              </div>
            </Button>
          )}

          {/* Divider */}
          <div className="border-t my-2" />

          {/* Send to Guests */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-primary/30"
            disabled={exporting || !eventId}
            onClick={() => setShowSendModal(true)}
          >
            <Send className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium">Send to Guests</p>
              <p className="text-xs text-muted-foreground">Email invitation image or SMS RSVP link</p>
            </div>
          </Button>

          {exporting && (
            <div className="space-y-1 pt-2">
              <p className="text-xs text-muted-foreground">
                {exportType === 'bulk'
                  ? `Generating ${bulkProgress.current}/${bulkProgress.total}...`
                  : 'Generating export...'}
              </p>
              <Progress
                value={
                  exportType === 'bulk' && bulkProgress.total > 0
                    ? (bulkProgress.current / bulkProgress.total) * 100
                    : undefined
                }
                className="h-1.5"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Modal */}
      {eventId && (
        <InvitationSendModal
          open={showSendModal}
          onOpenChange={setShowSendModal}
          guests={guests}
          eventId={eventId}
          template={template}
          customText={customText}
          customStyles={customStyles}
          eventData={eventData}
          qrConfig={qrConfig}
          qrDataUrl={qrDataUrl}
        />
      )}

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Export Limit Reached
            </DialogTitle>
            <DialogDescription>
              You've used all {FREE_EXPORT_LIMIT} free exports on the Starter plan. Upgrade to Essential, Premium, or Unlimited to enjoy unlimited invitation exports.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
              <div>
                <p className="font-semibold text-sm">Essential Plan</p>
                <p className="text-xs text-muted-foreground">Up to 100 guests</p>
              </div>
              <p className="font-bold text-primary">$99 AUD</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
              <div>
                <p className="font-semibold text-sm">Premium Plan</p>
                <p className="text-xs text-muted-foreground">Up to 300 guests</p>
              </div>
              <p className="font-bold text-primary">$149 AUD</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
              <div>
                <p className="font-semibold text-sm">Unlimited Plan</p>
                <p className="text-xs text-muted-foreground">Unlimited guests</p>
              </div>
              <p className="font-bold text-primary">$249 AUD</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>Maybe Later</Button>
            <Button onClick={() => {
              setShowUpgradeModal(false);
              // Navigate to pricing - uses existing pricing page
              window.location.href = '/#pricing';
            }}>
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
