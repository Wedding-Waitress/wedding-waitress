import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EVENT_TYPES } from '@/lib/mediaConstants';
import { cn } from '@/lib/utils';
import QRCodeLib from 'qrcode';
import { buildGuestLookupUrl } from '@/lib/urlUtils';

interface SetupWizardProps {
  eventId: string;
  eventSlug: string;
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ eventId, eventSlug, onComplete }) => {
  const [step, setStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    eventType: null as string | null,
    eventDisplayName: '',
    eventDate: null as Date | null,
  });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { profile } = useProfile();

  const handleCompleteSetup = async () => {
    if (!wizardData.eventType || !wizardData.eventDisplayName || !wizardData.eventDate) {
      toast({
        title: 'Error',
        description: 'Please complete all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update event with wizard data
      const { error: updateError } = await supabase
        .from('events')
        .update({
          event_type: wizardData.eventType,
          event_display_name: wizardData.eventDisplayName,
          event_date_override: format(wizardData.eventDate, 'yyyy-MM-dd'),
          setup_completed: true,
        })
        .eq('id', eventId);

      if (updateError) throw updateError;

      // Generate QR code for confirmation screen
      const uploadUrl = `${window.location.origin}/media/${eventSlug}`;
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 2000;
      
      await QRCodeLib.toCanvas(canvas, uploadUrl, {
        errorCorrectionLevel: 'H',
        margin: 4,
        width: 2000,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataUrl(canvas.toDataURL('image/png'));
      setStep(5); // Completion screen
    } catch (error: any) {
      console.error('Error completing setup:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete setup',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Welcome
  if (step === 1) {
    return (
      <div className="flex items-center justify-center min-h-[600px] p-4">
        <Card className="ww-box max-w-2xl w-full">
          <CardContent className="p-12 space-y-6 text-center">
            <div className="text-6xl mb-4">👋</div>
            <h1 className="text-4xl font-bold">
              Hey {profile?.first_name || 'there'}!
            </h1>
            <p className="text-xl text-muted-foreground">
              Let's set up your digital album and photo wall in no time!
            </p>
            <Button 
              size="lg"
              className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
              onClick={() => setStep(2)}
            >
              Let's Go 🚀
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Event Type
  if (step === 2) {
    return (
      <div className="flex items-center justify-center min-h-[600px] p-4">
        <Card className="ww-box max-w-3xl w-full">
          <CardContent className="p-12 space-y-6">
            <h2 className="text-3xl font-bold text-center">
              What kind of event are you up to?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setWizardData({ ...wizardData, eventType: type.id });
                    setStep(3);
                  }}
                  className={cn(
                    "p-8 rounded-2xl border-2 transition-all hover:scale-105",
                    "flex flex-col items-center gap-4",
                    wizardData.eventType === type.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-5xl">{type.emoji}</span>
                  <span className="font-semibold text-lg">{type.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Event Name
  if (step === 3) {
    return (
      <div className="flex items-center justify-center min-h-[600px] p-4">
        <Card className="ww-box max-w-2xl w-full">
          <CardContent className="p-12 space-y-6">
            <h2 className="text-3xl font-bold text-center">
              What would you like to call your event?
            </h2>
            <div className="mt-8 space-y-4">
              <Input
                type="text"
                placeholder="e.g. Dan and Rachel Wedding"
                value={wizardData.eventDisplayName}
                onChange={(e) => setWizardData({ ...wizardData, eventDisplayName: e.target.value })}
                className="text-lg p-6"
                autoFocus
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                  onClick={() => setStep(4)}
                  disabled={!wizardData.eventDisplayName.trim()}
                >
                  Continue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Event Date
  if (step === 4) {
    return (
      <div className="flex items-center justify-center min-h-[600px] p-4">
        <Card className="ww-box max-w-2xl w-full">
          <CardContent className="p-12 space-y-6">
            <h2 className="text-3xl font-bold text-center">
              When is the event?
            </h2>
            <div className="mt-8 space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left p-6 text-lg"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {wizardData.eventDate ? format(wizardData.eventDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                  <Calendar
                    mode="single"
                    selected={wizardData.eventDate || undefined}
                    onSelect={(date) => setWizardData({ ...wizardData, eventDate: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(3)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                  onClick={handleCompleteSetup}
                  disabled={!wizardData.eventDate || isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create My Event 🎉'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 5: Completion
  return (
    <div className="flex items-center justify-center min-h-[600px] p-4">
      <Card className="ww-box max-w-3xl w-full">
        <CardContent className="p-12 space-y-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold">Good Job!</h1>
          <p className="text-xl text-muted-foreground">
            You've just created your Photo & Video Album for{' '}
            <span className="text-primary font-semibold">{wizardData.eventDisplayName}</span>
          </p>
          
          {qrCodeDataUrl && (
            <Card className="bg-gradient-to-br from-primary/5 to-purple-100/50 p-8 space-y-4">
              <h3 className="text-lg font-semibold">Your Event QR Code</h3>
              <div className="bg-white p-6 rounded-lg inline-block">
                <img src={qrCodeDataUrl} alt="Event QR Code" className="w-64 h-64" />
              </div>
              <p className="text-sm text-muted-foreground">
                Share this QR code with your guests so they can upload photos and videos
              </p>
            </Card>
          )}

          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-lg px-8 py-6"
            onClick={onComplete}
          >
            Continue to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
