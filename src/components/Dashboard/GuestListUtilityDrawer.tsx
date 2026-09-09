import React from 'react';
import { Settings2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/enhanced-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SmartSmsCreditStatus } from './SmartSmsCreditStatus';
import styles from './GuestListTable.module.css';

export type GuestListUtilityDrawerKind = 'sms' | 'guest-live-view';

interface GuestListUtilityDrawerProps {
  eventId: string;
  kind: GuestListUtilityDrawerKind;
  open: boolean;
  recipientCount?: number;
  onOpenChange: (open: boolean) => void;
  onConfigureGuestLiveView: () => void;
}

export const GuestListUtilityDrawer: React.FC<GuestListUtilityDrawerProps> = ({
  eventId,
  kind,
  open,
  recipientCount,
  onOpenChange,
  onConfigureGuestLiveView,
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent
      side="right"
      className="ww-guest-analytics-drawer w-full sm:max-w-3xl overflow-y-auto"
    >
      {kind === 'sms' ? (
        <>
          <SheetHeader>
            <SheetTitle>SMS Credits</SheetTitle>
            <SheetDescription>
              View your current balance, messaging status and top-up options for this event.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <SmartSmsCreditStatus
              eventId={eventId}
              variant="full"
              recipientCount={recipientCount}
              className={styles.smsPanel}
            />
          </div>
        </>
      ) : (
        <>
          <SheetHeader>
            <SheetTitle>Guest Live View</SheetTitle>
            <SheetDescription>Privacy and visibility controls for this event.</SheetDescription>
          </SheetHeader>
          <div className={`${styles.protectionPanel} mt-4 rounded-xl p-4`}>
            <div className="flex items-start gap-3 min-w-0">
              <div className="bg-primary/10 text-primary rounded-full p-2.5 shrink-0">
                <ShieldCheck size={21} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-primary mb-1">
                  Guest Live View APP Protection. You have full control in what your guests see by switching preferences On / Off.
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  7 days before your event, RSVP responses, guest edits, and +1 requests are automatically hidden from the Live View app for security and event-day stability.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                  You still have full control over what guests can view during the final week through your Guest Live View Configuration settings.
                </p>
                <Button
                  variant="outline"
                  className={`lv-premium-shade mt-3 w-fit max-w-full ${styles.configureGuestLiveView}`}
                  onClick={onConfigureGuestLiveView}
                >
                  <Settings2 size={15} strokeWidth={1.8} className="mr-1.5 shrink-0" aria-hidden="true" />
                  Configure Guest Live View →
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </SheetContent>
  </Sheet>
);

export default GuestListUtilityDrawer;
