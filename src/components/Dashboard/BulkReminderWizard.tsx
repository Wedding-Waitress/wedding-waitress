import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Send, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReminderCampaigns } from '@/hooks/useReminderCampaigns';

interface BulkReminderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  guests: any[];
}

const STEPS = ['Recipients', 'Method', 'Message', 'Schedule', 'Review'];

export const BulkReminderWizard: React.FC<BulkReminderWizardProps> = ({
  isOpen,
  onClose,
  eventId,
  guests
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetStatus, setTargetStatus] = useState(['Pending']);
  const [deliveryMethod, setDeliveryMethod] = useState('whatsapp');
  const [useCascade, setUseCascade] = useState(true);
  const [message, setMessage] = useState('Hi {guest_name}! Friendly reminder to RSVP for {event_name}. Deadline: {rsvp_deadline}. Reply via: {qr_link}');
  const [scheduleType, setScheduleType] = useState('immediate');
  const [scheduledDate, setScheduledDate] = useState('');
  const [sending, setSending] = useState(false);
  
  const { toast } = useToast();
  const { createCampaign, sendCampaign } = useReminderCampaigns(eventId);

  const filteredGuests = guests.filter(g => {
    if (targetStatus.includes('All')) return true;
    return targetStatus.includes(g.rsvp);
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const campaign = await createCampaign({
        event_id: eventId,
        name: `Reminder - ${new Date().toLocaleDateString()}`,
        target_status: targetStatus,
        message_template: message,
        delivery_method: useCascade ? 'cascade' : deliveryMethod,
        status: scheduleType === 'immediate' ? 'sending' : 'scheduled',
        scheduled_for: scheduleType === 'scheduled' ? scheduledDate : null,
        total_count: filteredGuests.length
      });

      if (campaign && scheduleType === 'immediate') {
        await sendCampaign(campaign.id);
      }

      toast({
        title: 'Success',
        description: scheduleType === 'immediate' 
          ? `Sending reminders to ${filteredGuests.length} guests`
          : `Reminder scheduled for ${filteredGuests.length} guests`
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reminders',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Recipients
        return (
          <div className="space-y-4">
            <div>
              <Label>Target Recipients</Label>
              <RadioGroup value={targetStatus[0]} onValueChange={(val) => setTargetStatus([val])} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Pending" id="pending" />
                  <Label htmlFor="pending">Pending RSVPs only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Not Attending" id="declined" />
                  <Label htmlFor="declined">Declined</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="All" id="all" />
                  <Label htmlFor="all">All guests</Label>
                </div>
              </RadioGroup>
            </div>
            <Badge variant="secondary" className="text-sm">
              {filteredGuests.length} guests will receive this reminder
            </Badge>
          </div>
        );

      case 1: // Method
        return (
          <div className="space-y-4">
            <div>
              <Label>Delivery Method</Label>
              <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="whatsapp" id="whatsapp" />
                  <Label htmlFor="whatsapp">WhatsApp (Recommended)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sms" id="sms" />
                  <Label htmlFor="sms">SMS</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email">Email</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={useCascade} onCheckedChange={(checked) => setUseCascade(checked as boolean)} id="cascade" />
              <Label htmlFor="cascade">Try WhatsApp → SMS → Email cascade</Label>
            </div>
          </div>
        );

      case 2: // Message
        return (
          <div className="space-y-4">
            <div>
              <Label>Message Template</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Variables: {'{guest_name}'}, {'{event_name}'}, {'{rsvp_deadline}'}, {'{qr_link}'}
              </p>
            </div>
            <Badge variant="outline">{message.length} characters</Badge>
          </div>
        );

      case 3: // Schedule
        return (
          <div className="space-y-4">
            <RadioGroup value={scheduleType} onValueChange={setScheduleType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="immediate" id="immediate" />
                <Label htmlFor="immediate">Send Immediately</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scheduled" id="scheduled" />
                <Label htmlFor="scheduled">Schedule for later</Label>
              </div>
            </RadioGroup>
            {scheduleType === 'scheduled' && (
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            )}
          </div>
        );

      case 4: // Review
        return (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p><strong>Recipients:</strong> {filteredGuests.length} guests ({targetStatus.join(', ')})</p>
              <p><strong>Method:</strong> {useCascade ? 'Cascade (WhatsApp → SMS → Email)' : deliveryMethod}</p>
              <p><strong>Schedule:</strong> {scheduleType === 'immediate' ? 'Send now' : scheduledDate}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Message Preview:</p>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Bulk RSVP Reminders</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              {STEPS.map((step, idx) => (
                <span
                  key={step}
                  className={idx === currentStep ? 'font-bold text-primary' : 'text-muted-foreground'}
                >
                  {step}
                </span>
              ))}
            </div>
            <Progress value={(currentStep / (STEPS.length - 1)) * 100} />
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || sending}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {currentStep === STEPS.length - 1 ? (
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Reminders
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
