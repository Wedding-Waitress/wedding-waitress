import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Users, FileText, Send, Loader2, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EmailTemplatePreview } from './EmailTemplatePreview';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type TemplateType = 'elegant' | 'modern' | 'rustic';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  rsvp: string;
}

interface InitialInvitationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  guests: Guest[];
  onSuccess: () => void;
}

export const InitialInvitationWizard = ({
  open,
  onOpenChange,
  eventId,
  eventName,
  guests,
  onSuccess,
}: InitialInvitationWizardProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<'recipients' | 'template' | 'review'>('recipients');
  const [loading, setLoading] = useState(false);
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'pending' | 'attending'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('modern');
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = useState<string | null>(null);
  const [customSubject, setCustomSubject] = useState(`RSVP for ${eventName}`);
  const [customMessage, setCustomMessage] = useState('');
  
  // Fetch user's saved templates
  const { templates } = useEmailTemplates(eventId);

  // Filter guests with valid emails
  const guestsWithEmail = guests.filter(g => g.email && g.email.trim() !== '');
  
  // Apply recipient filter
  const filteredGuests = guestsWithEmail.filter(g => {
    if (recipientFilter === 'all') return true;
    if (recipientFilter === 'pending') return g.rsvp === 'Pending';
    if (recipientFilter === 'attending') return g.rsvp === 'Attending';
    return true;
  });

  const handleSendInvitations = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine target statuses based on filter
      let targetStatus: string[] | null = null;
      if (recipientFilter === 'pending') targetStatus = ['Pending'];
      else if (recipientFilter === 'attending') targetStatus = ['Attending'];

      // Create campaign with template settings
      const { data: campaign, error: campaignError } = await supabase
        .from('rsvp_reminder_campaigns')
        .insert({
          event_id: eventId,
          user_id: user.id,
          name: `Initial Invitations - ${new Date().toLocaleDateString()}`,
          target_status: targetStatus,
          message_template: JSON.stringify({
            template_type: selectedTemplate,
            custom_template_id: selectedCustomTemplateId,
            custom_message: customMessage,
            custom_subject: customSubject,
          }),
          delivery_method: 'email',
          campaign_type: 'initial_invitation',
          status: 'pending',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Call edge function to send invitations
      const { data, error } = await supabase.functions.invoke('send-initial-invitations', {
        body: { campaign_id: campaign.id },
      });

      if (error) throw error;

      toast({
        title: 'Invitations Sent! 📧',
        description: `Successfully sent ${data.sent_count} invitation emails`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset wizard
      setCurrentStep('recipients');
      setRecipientFilter('all');
      setSelectedTemplate('modern');
      setCustomSubject(`RSVP for ${eventName}`);
      setCustomMessage('');
    } catch (error: any) {
      console.error('Failed to send invitations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Send Initial RSVP Invitations
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recipients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Recipients
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Template
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Review
            </TabsTrigger>
          </TabsList>

          {/* Step 1: Select Recipients */}
          <TabsContent value="recipients" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Select Recipients</Label>
              <RadioGroup value={recipientFilter} onValueChange={(v) => setRecipientFilter(v as any)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-secondary/50">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex-1 cursor-pointer">
                    All Guests ({guestsWithEmail.length} with email)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-secondary/50">
                  <RadioGroupItem value="pending" id="pending" />
                  <Label htmlFor="pending" className="flex-1 cursor-pointer">
                    Only Pending RSVPs ({guestsWithEmail.filter(g => g.rsvp === 'Pending').length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-secondary/50">
                  <RadioGroupItem value="attending" id="attending" />
                  <Label htmlFor="attending" className="flex-1 cursor-pointer">
                    Only Attending ({guestsWithEmail.filter(g => g.rsvp === 'Attending').length})
                  </Label>
                </div>
              </RadioGroup>

              {guests.length - guestsWithEmail.length > 0 && (
                <div className="p-3 bg-warning/10 border border-warning rounded-lg">
                  <p className="text-sm text-warning">
                    ⚠️ {guests.length - guestsWithEmail.length} guest(s) don't have email addresses and will be skipped
                  </p>
                </div>
              )}

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-primary">
                  📧 Sending to {filteredGuests.length} guest{filteredGuests.length !== 1 ? 's' : ''} with valid emails
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  💰 Estimated cost: $0.00 (free email delivery)
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep('template')}>
                Next: Customize Template
              </Button>
            </div>
          </TabsContent>

          {/* Step 2: Email Template */}
          <TabsContent value="template" className="space-y-5 mt-4">
            <div className="space-y-4">
              {/* Template Selection */}
              <div className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">Choose Template Style</Label>
                  <p className="text-sm text-muted-foreground mt-1">Select the design that matches your event aesthetic</p>
                </div>
                <EmailTemplatePreview 
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={(template) => {
                    setSelectedTemplate(template);
                    setSelectedCustomTemplateId(null);
                  }}
                />
              </div>

              {/* Saved Templates */}
              {templates.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <Label className="text-base font-semibold">My Saved Templates</Label>
                    <p className="text-sm text-muted-foreground mt-1">Use a template you've created</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {templates.slice(0, 4).map((template) => (
                      <Card
                        key={template.id}
                        className={`p-3 cursor-pointer transition-all ${
                          selectedCustomTemplateId === template.id
                            ? 'ring-2 ring-primary shadow-lg'
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => {
                          setSelectedCustomTemplateId(template.id);
                          setSelectedTemplate('modern'); // Reset system template
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{template.template_name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(template.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {selectedCustomTemplateId === template.id && (
                            <Badge variant="default" className="shrink-0">Selected</Badge>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary"
                    onClick={() => {
                      // Open gallery in new window or navigate
                      window.open('/dashboard?tab=email-templates', '_blank');
                    }}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Browse Template Gallery
                  </Button>
                </div>
              )}

              {/* Customization */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Customize Details</Label>
                
                <div>
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder={`RSVP for ${eventName}`}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Custom Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal message that will appear in the invitation email..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* What's Included */}
              <div className="p-4 border rounded-lg bg-card">
                <h4 className="font-semibold mb-2">What's Included</h4>
                <div className="text-sm text-muted-foreground space-y-1.5">
                  <p>✅ Personalized greeting with guest name</p>
                  <p>✅ Event details (date, venue, hosts)</p>
                  <p>✅ Embedded QR code for quick RSVP</p>
                  <p>✅ Clickable RSVP button</p>
                  <p>✅ Professional {selectedCustomTemplateId ? 'custom' : selectedTemplate} design</p>
                  <p>✅ Mobile-optimized layout</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setCurrentStep('recipients')}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep('review')}>
                Next: Review & Send
              </Button>
            </div>
          </TabsContent>

          {/* Step 3: Review & Send */}
          <TabsContent value="review" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="p-4 border rounded-lg bg-card space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Recipients</h4>
                  <p className="text-lg font-semibold">{filteredGuests.length} guests</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Template Style</h4>
                  <p className="text-lg font-semibold capitalize">
                    {selectedCustomTemplateId 
                      ? templates.find(t => t.id === selectedCustomTemplateId)?.template_name || 'Custom'
                      : selectedTemplate
                    }
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Delivery Method</h4>
                  <p className="text-lg font-semibold">Email (FREE)</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Subject</h4>
                  <p className="text-lg">{customSubject}</p>
                </div>
                {customMessage && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Custom Message</h4>
                    <p className="text-sm">{customMessage}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-success/10 border border-success rounded-lg">
                <p className="text-sm font-semibold text-success flex items-center gap-2">
                  ✅ Ready to Send
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Each guest will receive a personalized email with an embedded QR code for easy RSVP access.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('template')}>
                Back
              </Button>
              <Button
                onClick={handleSendInvitations}
                disabled={loading || filteredGuests.length === 0}
                className="bg-gradient-to-r from-primary to-purple-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send {filteredGuests.length} Invitations
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
