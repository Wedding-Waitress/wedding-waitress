import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Palette, Type, FileText } from 'lucide-react';
import { generateCustomEmailTemplate } from '@/lib/emailTemplateGenerator';
import type { TemplateType } from '@/../supabase/functions/send-initial-invitations/_templates';

interface TemplateEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTemplate?: TemplateType;
  eventData?: {
    eventName?: string;
    eventDate?: string;
    eventVenue?: string;
    partner1Name?: string;
    partner2Name?: string;
  };
  onSave: (data: {
    template_name: string;
    subject: string;
    html_body: string;
  }) => Promise<boolean>;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  open,
  onOpenChange,
  initialTemplate = 'modern',
  eventData,
  onSave,
}) => {
  const [templateName, setTemplateName] = useState('');
  const [subject, setSubject] = useState('You\'re Invited!');
  const [baseTemplate, setBaseTemplate] = useState<TemplateType>(initialTemplate);
  const [customMessage, setCustomMessage] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#667eea');
  const [saving, setSaving] = useState(false);

  // Generate preview HTML
  const previewHtml = generateCustomEmailTemplate({
    baseTemplate,
    customizations: {
      customMessage,
      primaryColor,
    },
    eventData: {
      eventName: eventData?.eventName || 'Sample Wedding',
      eventDate: eventData?.eventDate || 'June 15, 2024',
      eventVenue: eventData?.eventVenue || 'Beautiful Venue',
      guestFirstName: 'John',
      guestLastName: 'Doe',
      partner1Name: eventData?.partner1Name,
      partner2Name: eventData?.partner2Name,
      qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      eventUrl: 'https://example.com/rsvp',
    },
  });

  const handleSave = async () => {
    if (!templateName.trim()) {
      return;
    }

    setSaving(true);
    const success = await onSave({
      template_name: templateName,
      subject,
      html_body: previewHtml,
    });

    if (success) {
      onOpenChange(false);
      // Reset form
      setTemplateName('');
      setSubject('You\'re Invited!');
      setCustomMessage('');
      setPrimaryColor('#667eea');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create Custom Email Template</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left Panel - Customization */}
          <div className="w-96 flex-shrink-0 overflow-y-auto space-y-4 pr-2">
            <Tabs defaultValue="design" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="design">
                  <Palette className="w-4 h-4 mr-1" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="content">
                  <FileText className="w-4 h-4 mr-1" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Type className="w-4 h-4 mr-1" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="design" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="baseTemplate">Base Template</Label>
                  <Select value={baseTemplate} onValueChange={(v) => setBaseTemplate(v as TemplateType)}>
                    <SelectTrigger id="baseTemplate" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elegant">Elegant</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="rustic">Rustic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#667eea"
                      className="flex-1"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="customMessage">Custom Message</Label>
                  <Textarea
                    id="customMessage"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal message to your invitation..."
                    rows={4}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This message will appear in the email body
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="templateName">Template Name *</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="My Wedding Invitation"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Email Subject *</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="You're Invited!"
                    className="mt-1"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="flex-1 overflow-hidden border rounded-lg bg-muted/30 flex flex-col">
            <div className="p-3 border-b bg-card">
              <h3 className="font-semibold text-sm">Live Preview</h3>
              <p className="text-xs text-muted-foreground">See how your template will look</p>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
              <div className="bg-white shadow-xl max-w-[600px] w-full">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border-0"
                  style={{ height: '700px' }}
                  title="Template Preview"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!templateName.trim() || saving}
            className="bg-gradient-to-r from-primary to-purple-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
