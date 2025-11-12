import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Mail, Loader2 } from 'lucide-react';
import { StandardEventSelector } from '@/components/Dashboard/StandardEventSelector';
import { TemplateCard } from '@/components/Dashboard/EmailTemplates/TemplateCard';
import { TemplatePreviewModal } from '@/components/Dashboard/EmailTemplates/TemplatePreviewModal';
import { TemplateEditorModal } from '@/components/Dashboard/EmailTemplates/TemplateEditorModal';
import { useEvents } from '@/hooks/useEvents';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { getSystemTemplates, generateCustomEmailTemplate } from '@/lib/emailTemplateGenerator';
import { EmailTemplatePreview } from '@/components/Dashboard/EmailTemplatePreview';
import type { TemplateType } from '@/../supabase/functions/send-initial-invitations/_templates';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const EmailTemplateGalleryPage = () => {
  const { events, loading: eventsLoading } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { templates, loading: templatesLoading, saveTemplate, deleteTemplate, duplicateTemplate } = useEmailTemplates(selectedEventId);
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    html: string;
    name: string;
    type: 'system' | 'custom';
    templateId?: string;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const selectedEvent = useMemo(
    () => events.find(e => e.id === selectedEventId),
    [events, selectedEventId]
  );

  const systemTemplates = getSystemTemplates();

  // Generate preview for system template
  const generateSystemTemplatePreview = (templateType: TemplateType) => {
    return generateCustomEmailTemplate({
      baseTemplate: templateType,
      eventData: {
        eventName: selectedEvent?.name || 'Sample Wedding',
        eventDate: selectedEvent?.date || 'June 15, 2024',
        eventVenue: selectedEvent?.venue || 'Beautiful Venue',
        partner1Name: selectedEvent?.partner1_name,
        partner2Name: selectedEvent?.partner2_name,
        guestFirstName: 'John',
        guestLastName: 'Doe',
        qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        eventUrl: 'https://example.com/rsvp',
      },
    });
  };

  const handlePreviewSystemTemplate = (templateType: TemplateType, name: string) => {
    const html = generateSystemTemplatePreview(templateType);
    setPreviewData({ html, name, type: 'system' });
    setPreviewOpen(true);
  };

  const handlePreviewCustomTemplate = (template: typeof templates[0]) => {
    setPreviewData({
      html: template.html_body,
      name: template.template_name,
      type: 'custom',
      templateId: template.id,
    });
    setPreviewOpen(true);
  };

  const handleDeleteClick = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate(templateToDelete);
      setTemplateToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="ww-box">
        <CardHeader className="flex flex-col gap-4 pb-6">
          <div className="flex items-start gap-3">
            <Mail className="w-16 h-16 text-primary flex-shrink-0" />
            <div className="flex flex-col flex-1">
              <CardTitle className="mb-2 text-left text-2xl font-medium text-primary">
                Email Template Gallery
              </CardTitle>
              <CardDescription className="text-left">
                Browse pre-designed templates or create and save your own custom templates for RSVP invitation campaigns. 
                Choose from elegant, modern, or rustic designs, then customize them to match your event's aesthetic.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <StandardEventSelector
              events={events}
              selectedEventId={selectedEventId}
              onEventSelect={setSelectedEventId}
              loading={eventsLoading}
            />
            
            <Button
              onClick={() => setEditorOpen(true)}
              disabled={!selectedEventId}
              className="bg-gradient-to-r from-primary to-purple-600 gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Custom Template
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* System Templates Section */}
      <Card className="ww-box">
        <CardHeader>
          <CardTitle className="text-xl">System Templates</CardTitle>
          <CardDescription>
            Professional pre-designed templates ready to use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {systemTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={{
                  id: template.id,
                  name: template.name,
                  description: template.description,
                  type: 'system',
                  preview: <EmailTemplatePreview selectedTemplate={template.id as TemplateType} onSelectTemplate={() => {}} />,
                }}
                onPreview={() => handlePreviewSystemTemplate(template.id as TemplateType, template.name)}
                onUse={() => {
                  // Open editor with this template as base
                  setEditorOpen(true);
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Saved Templates Section */}
      <Card className="ww-box">
        <CardHeader>
          <CardTitle className="text-xl">My Saved Templates</CardTitle>
          <CardDescription>
            Custom templates you've created and saved
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={{
                    id: template.id,
                    name: template.template_name,
                    type: 'custom',
                    created_at: template.created_at,
                  }}
                  onPreview={() => handlePreviewCustomTemplate(template)}
                  onUse={() => handlePreviewCustomTemplate(template)}
                  onEdit={() => {
                    // TODO: Open editor with template data
                    setEditorOpen(true);
                  }}
                  onDelete={() => handleDeleteClick(template.id)}
                  onDuplicate={() => duplicateTemplate(template.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Custom Templates Yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Start by customizing a system template or create your own from scratch
              </p>
              <Button
                onClick={() => setEditorOpen(true)}
                disabled={!selectedEventId}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewData && (
        <TemplatePreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          templateHtml={previewData.html}
          templateName={previewData.name}
          onUse={() => {
            setPreviewOpen(false);
            // TODO: Navigate to wizard with selected template
          }}
          onCustomize={previewData.type === 'system' ? () => {
            setPreviewOpen(false);
            setEditorOpen(true);
          } : undefined}
        />
      )}

      {/* Template Editor Modal */}
      <TemplateEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        eventData={selectedEvent ? {
          eventName: selectedEvent.name,
          eventDate: selectedEvent.date,
          eventVenue: selectedEvent.venue,
          partner1Name: selectedEvent.partner1_name,
          partner2Name: selectedEvent.partner2_name,
        } : undefined}
        onSave={(data) => saveTemplate({ ...data, event_id: selectedEventId })}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
