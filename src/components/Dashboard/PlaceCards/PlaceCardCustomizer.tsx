import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { Palette, Type, Image, MessageSquare, Sparkles, Grid3X3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PLACE_CARD_TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesByCategory, getTemplateById } from '@/lib/PlaceCardTemplates';

interface PlaceCardCustomizerProps {
  settings: PlaceCardSettings | null;
  onSettingsChange: (settings: Partial<PlaceCardSettings>) => Promise<boolean>;
  guests: Guest[];
}

interface ExtendedPlaceCardSettings extends PlaceCardSettings {
  template_id?: string;
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Dancing Script', label: 'Dancing Script' },
  { value: 'Great Vibes', label: 'Great Vibes' },
  { value: 'Pacifico', label: 'Pacifico' },
];

export const PlaceCardCustomizer: React.FC<PlaceCardCustomizerProps> = ({
  settings,
  onSettingsChange,
  guests
}) => {
  const [individualMessages, setIndividualMessages] = useState<Record<string, string>>(
    settings?.individual_messages || {}
  );
  const [uploading, setUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const { toast } = useToast();

  const currentSettings = settings || {
    event_id: '',
    user_id: '',
    font_family: 'Inter',
    font_color: '#000000',
    background_color: '#ffffff',
    background_image_url: null,
    background_image_type: 'none' as const,
    mass_message: '',
    individual_messages: {},
  };

  const handleSettingChange = async (key: keyof PlaceCardSettings, value: any) => {
    await onSettingsChange({ [key]: value });
  };

  const handleIndividualMessageChange = (guestId: string, message: string) => {
    const newMessages = { ...individualMessages, [guestId]: message };
    setIndividualMessages(newMessages);
  };

  const saveIndividualMessages = async () => {
    await onSettingsChange({ individual_messages: individualMessages });
  };

  const applyTemplate = async (templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    
    // Apply template styles
    await onSettingsChange({
      font_family: template.styles.font_family,
      font_color: template.styles.font_color,
      background_color: template.styles.background_color,
    });

    toast({
      title: "Template Applied",
      description: `${template.name} template has been applied`,
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `place-card-bg-${Date.now()}.${fileExt}`;
      const filePath = `place-cards/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('qr-assets')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('qr-assets')
        .getPublicUrl(filePath);

      await handleSettingChange('background_image_url', publicUrl);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Customize Place Cards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="background">Background</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4" />
                  Design Templates
                </Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose from professionally designed templates for your place cards
                </p>
              </div>

              {TEMPLATE_CATEGORIES.map((category) => (
                <div key={category.id} className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <span>{category.icon}</span>
                    {category.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {getTemplatesByCategory(category.id).map((template) => (
                      <div
                        key={template.id}
                        className={`border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                          selectedTemplate === template.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => applyTemplate(template.id)}
                      >
                        <div className="text-sm font-medium mb-1">{template.name}</div>
                        <div 
                          className="text-xs p-2 rounded border bg-background/50"
                          style={{
                            fontFamily: template.styles.font_family,
                            color: template.styles.font_color,
                            backgroundColor: template.styles.background_color,
                          }}
                        >
                          John Smith
                          <div className="text-xs opacity-70 mt-1">Table 1, Seat 1</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="design" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Type className="h-4 w-4" />
                  Font Family
                </Label>
                <Select
                  value={currentSettings.font_family}
                  onValueChange={(value) => handleSettingChange('font_family', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4" />
                  Font Color
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={currentSettings.font_color}
                    onChange={(e) => handleSettingChange('font_color', e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={currentSettings.font_color}
                    onChange={(e) => handleSettingChange('font_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4" />
                  Card Background Color
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={currentSettings.background_color}
                    onChange={(e) => handleSettingChange('background_color', e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={currentSettings.background_color}
                    onChange={(e) => handleSettingChange('background_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="background" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Image className="h-4 w-4" />
                  Background Image
                </Label>
                <RadioGroup
                  value={currentSettings.background_image_type}
                  onValueChange={(value: 'none' | 'decorative' | 'full') => 
                    handleSettingChange('background_image_type', value)
                  }
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none">No background image</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="decorative" id="decorative" />
                    <Label htmlFor="decorative">Small decorative image on side</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full">Full background image</Label>
                  </div>
                </RadioGroup>
              </div>

              {currentSettings.background_image_type !== 'none' && (
                <div>
                  <Label className="mb-2 block">Upload Image</Label>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {uploading && (
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    )}
                    {currentSettings.background_image_url && (
                      <div className="mt-2">
                        <img
                          src={currentSettings.background_image_url}
                          alt="Background preview"
                          className="w-20 h-20 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4" />
                  Mass Message (applies to all cards)
                </Label>
                <Textarea
                  placeholder="Enter a message for all place cards..."
                  value={currentSettings.mass_message}
                  onChange={(e) => handleSettingChange('mass_message', e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label className="mb-3 block">Individual Messages</Label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {guests.map((guest) => (
                    <div key={guest.id} className="p-3 border rounded-lg">
                      <Label className="text-sm font-medium mb-1 block">
                        {guest.first_name} {guest.last_name}
                      </Label>
                      <Input
                        placeholder="Personal message for this guest..."
                        value={individualMessages[guest.id] || ''}
                        onChange={(e) => handleIndividualMessageChange(guest.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                {guests.length > 0 && (
                  <Button 
                    onClick={saveIndividualMessages}
                    variant="outline"
                    className="w-full mt-3"
                  >
                    Save Individual Messages
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};