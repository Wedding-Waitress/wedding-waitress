import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Eye, Upload, GripVertical } from 'lucide-react';
import { useInvitationTemplates, type InvitationTemplate, type TextZone, type CardType } from '@/hooks/useInvitationTemplates';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TemplateTextZoneEditor } from './TemplateTextZoneEditor';

const CATEGORIES = ['General', 'Floral', 'Modern', 'Classic', 'Rustic', 'Elegant', 'Minimalist', 'Islamic', 'Indian', 'Bohemian'];

const getDefaultTextZones = (cardType: CardType): TextZone[] => {
  const base = (id: string, label: string, type: TextZone['type'], opts: Partial<TextZone>): TextZone => ({
    id,
    label,
    type,
    default_text: opts.default_text || '',
    x_percent: opts.x_percent ?? 50,
    y_percent: opts.y_percent ?? 50,
    width_percent: opts.width_percent ?? 80,
    font_family: opts.font_family || 'Montserrat',
    font_size: opts.font_size ?? 14,
    font_color: opts.font_color || '#333333',
    font_weight: opts.font_weight || 'normal',
    text_align: opts.text_align || 'center',
    letter_spacing: opts.letter_spacing ?? 0,
    max_lines: opts.max_lines ?? 2,
  });

  if (cardType === 'save_the_date') {
    return [
      base('couple_names', 'Couple Names', 'auto', { auto_field: 'couple_names', y_percent: 25, font_family: 'Great Vibes', font_size: 28 }),
      base('date', 'Date', 'auto', { auto_field: 'date', y_percent: 45, font_family: 'Playfair Display', font_size: 16, letter_spacing: 1 }),
      base('venue', 'Venue', 'auto', { auto_field: 'venue', y_percent: 58, font_family: 'Playfair Display', font_size: 14 }),
    ];
  }

  if (cardType === 'thank_you') {
    return [
      base('couple_names', 'Couple Names', 'auto', { auto_field: 'couple_names', y_percent: 22, font_family: 'Great Vibes', font_size: 28 }),
      base('message', 'Thank You Message', 'custom', { default_text: 'Thank you for sharing our special day', y_percent: 48, font_family: 'Montserrat', font_size: 14 }),
      base('guest_name', 'Guest Name', 'guest_name', { default_text: 'Guest Name', y_percent: 72, font_family: 'Great Vibes', font_size: 16 }),
    ];
  }

  // Default: invitation (12-zone layout, all centered at x_percent: 50)
  return [
    base('welcome', 'Welcome Message', 'custom', { default_text: 'Join us to celebrate the marriage of', y_percent: 10, font_family: 'Montserrat', font_size: 12 }),
    base('couple_names', 'Couple Names', 'auto', { auto_field: 'couple_names', y_percent: 17, font_family: 'Great Vibes', font_size: 28 }),
    base('ceremony_date', 'Ceremony Date', 'auto', { auto_field: 'date', y_percent: 24, font_family: 'Playfair Display', font_size: 16, letter_spacing: 1 }),
    base('ceremony_time', 'Ceremony Time', 'auto', { auto_field: 'time', y_percent: 30, font_family: 'Playfair Display', font_size: 14 }),
    base('ceremony_venue', 'Ceremony Venue', 'auto', { auto_field: 'venue', y_percent: 36, font_family: 'Playfair Display', font_size: 14 }),
    base('reception_date', 'Reception Date', 'custom', { default_text: 'Reception Date', y_percent: 43, font_family: 'Playfair Display', font_size: 14 }),
    base('reception_time', 'Reception Time', 'custom', { default_text: 'Reception Time', y_percent: 49, font_family: 'Playfair Display', font_size: 14 }),
    base('reception_venue', 'Reception Venue', 'custom', { default_text: 'Reception Venue', y_percent: 55, font_family: 'Playfair Display', font_size: 14 }),
    base('dress_code', 'Dress Code', 'custom', { default_text: 'Cocktail Attire', y_percent: 62, font_family: 'Montserrat', font_size: 12 }),
    base('rsvp', 'RSVP Details', 'custom', { default_text: 'RSVP by ...', y_percent: 69, font_family: 'Montserrat', font_size: 12 }),
    base('guest_name', 'Guest Name', 'guest_name', { default_text: 'Guest Name', y_percent: 76, font_family: 'Great Vibes', font_size: 16 }),
    base('notes', 'Notes', 'custom', { default_text: '', y_percent: 83, font_family: 'Montserrat', font_size: 11 }),
  ];
};
const CARD_TYPES: { value: CardType; label: string }[] = [
  { value: 'save_the_date', label: 'Save The Date' },
  { value: 'invitation', label: 'Invitation' },
  { value: 'thank_you', label: 'Thank You' },
];

export const AdminInvitationTemplates: React.FC = () => {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useInvitationTemplates();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvitationTemplate | null>(null);
  const [zoneEditorTemplate, setZoneEditorTemplate] = useState<InvitationTemplate | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formCardType, setFormCardType] = useState<CardType>('invitation');
  const [formOrientation, setFormOrientation] = useState('portrait');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPreviewUrl, setFormPreviewUrl] = useState('');

  const resetForm = () => {
    setFormName('');
    setFormCategory('General');
    setFormCardType('invitation');
    setFormOrientation('portrait');
    setFormFile(null);
    setFormPreviewUrl('');
    setEditingTemplate(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEdit = (template: InvitationTemplate) => {
    setFormName(template.name);
    setFormCategory(template.category);
    setFormCardType((template as any).card_type || 'invitation');
    setFormOrientation(template.orientation);
    setFormPreviewUrl(template.background_url);
    setEditingTemplate(template);
    setShowCreateDialog(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormFile(file);
      setFormPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to upload', variant: 'destructive' });
      return null;
    }
    const ext = file.name.split('.').pop();
    const path = `${user.id}/templates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('invitations').upload(path, file);
    if (error) {
      toast({ title: 'Upload Error', description: error.message, variant: 'destructive' });
      return null;
    }
    const { data: urlData } = supabase.storage.from('invitations').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Error', description: 'Template name is required', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      let backgroundUrl = editingTemplate?.background_url || '';

      if (formFile) {
        const url = await uploadFile(formFile);
        if (!url) return;
        backgroundUrl = url;
      }

      if (!backgroundUrl) {
        toast({ title: 'Error', description: 'Please upload a background image', variant: 'destructive' });
        return;
      }

      const dims = formOrientation === 'portrait'
        ? { width_mm: 148, height_mm: 210 }
        : { width_mm: 210, height_mm: 148 };

      const templateData: any = {
        name: formName.trim(),
        category: formCategory,
        card_type: formCardType,
        orientation: formOrientation,
        background_url: backgroundUrl,
        ...dims,
      };

      // Auto-generate default text zones for new templates
      if (!editingTemplate) {
        templateData.text_zones = getDefaultTextZones(formCardType);
      }

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData);
        toast({ title: 'Updated', description: 'Template updated successfully' });
      } else {
        await createTemplate(templateData);
        toast({ title: 'Created', description: 'Template created successfully' });
      }

      setShowCreateDialog(false);
      resetForm();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (template: InvitationTemplate) => {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
    await deleteTemplate(template.id);
    toast({ title: 'Deleted', description: 'Template deleted' });
  };

  const handleZonesSaved = async (templateId: string, zones: TextZone[]) => {
    await updateTemplate(templateId, { text_zones: zones } as any);
    setZoneEditorTemplate(null);
    toast({ title: 'Saved', description: 'Text zones saved successfully' });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading templates...</p>
        </CardContent>
      </Card>
    );
  }

  // If zone editor is open, show it full-screen
  if (zoneEditorTemplate) {
    return (
      <TemplateTextZoneEditor
        template={zoneEditorTemplate}
        onSave={(zones) => handleZonesSaved(zoneEditorTemplate.id, zones)}
        onCancel={() => setZoneEditorTemplate(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Invitation Templates</h2>
          <p className="text-sm text-muted-foreground">{templates.length} template(s) in library</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">No templates yet</h3>
            <p className="text-muted-foreground mb-4">Upload your first invitation background artwork to get started.</p>
            <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Template</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map(template => (
            <Card key={template.id} className="overflow-hidden group">
              <div className="relative aspect-[148/210] bg-muted">
                <img
                  src={template.background_url}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {template.orientation === 'portrait' ? '↕ Portrait' : '↔ Landscape'}
                  </Badge>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-white font-medium text-sm">{template.name}</p>
                  <p className="text-white/70 text-xs">{(template as any).card_type === 'save_the_date' ? 'Save The Date' : (template as any).card_type === 'thank_you' ? 'Thank You' : 'Invitation'} · {template.category} · {template.text_zones.length} zones</p>
                </div>
              </div>
              <CardContent className="p-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setZoneEditorTemplate(template)}>
                  <GripVertical className="w-3 h-3" /> Text Zones
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(template)}>
                  <Edit className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(template)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Add New Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Rustic Garden" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Card Type</Label>
              <Select value={formCardType} onValueChange={(v) => setFormCardType(v as CardType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARD_TYPES.map(ct => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Orientation</Label>
              <Select value={formOrientation} onValueChange={setFormOrientation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait (A5 — 148×210mm)</SelectItem>
                  <SelectItem value="landscape">Landscape (A5 — 210×148mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Background Artwork</Label>
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full gap-2">
                  <Upload className="w-4 h-4" /> {formFile ? formFile.name : 'Choose Image'}
                </Button>
              </div>
              {formPreviewUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border aspect-[148/210] max-h-48">
                  <img src={formPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={uploading}>
              {uploading ? 'Uploading...' : editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
