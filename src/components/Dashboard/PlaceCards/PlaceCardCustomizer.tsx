import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { Palette, Type, Image, MessageSquare, Sparkles, Grid3X3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PLACE_CARD_TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesByCategory, getTemplateById } from '@/lib/PlaceCardTemplates';
import { ColorPickerPopover } from '@/components/ui/color-picker-popover';

interface PlaceCardCustomizerProps {
  settings: PlaceCardSettings | null;
  onSettingsChange: (settings: Partial<PlaceCardSettings>) => Promise<boolean>;
  guests: Guest[];
}

interface ExtendedPlaceCardSettings extends PlaceCardSettings {
  template_id?: string;
}

const FONT_OPTIONS = [
// System Fonts - Arial Family
{
  value: 'Arial',
  label: 'Arial'
}, {
  value: 'Arial Black',
  label: 'Arial Black'
}, {
  value: 'Arial Narrow',
  label: 'Arial Narrow'
},
// Custom Premium Fonts
{
  value: 'Beauty Mountains',
  label: 'Beauty Mountains 💎'
}, {
  value: 'Valentine Baby',
  label: 'Valentine Baby 💎'
}, {
  value: 'Amsterdam',
  label: 'Amsterdam 💎'
}, {
  value: 'Back to Black Demo',
  label: 'Back to Black Demo 💎'
}, {
  value: 'Flagfies',
  label: 'Flagfies 💎'
}, {
  value: 'Sphere Memory',
  label: 'Sphere Memory 💎'
}, {
  value: 'ET Emilia Grace Demo',
  label: 'ET Emilia Grace Demo 💎'
}, {
  value: 'Grained',
  label: 'Grained 💎'
},
// Elegant Script & Calligraphy (Wedding Focused)
{
  value: 'Allura',
  label: 'Allura ✨'
}, {
  value: 'Alex Brush',
  label: 'Alex Brush ✨'
}, {
  value: 'Tangerine',
  label: 'Tangerine ✨'
}, {
  value: 'Pinyon Script',
  label: 'Pinyon Script ✨'
}, {
  value: 'Satisfy',
  label: 'Satisfy ✨'
}, {
  value: 'Parisienne',
  label: 'Parisienne ✨'
}, {
  value: 'Marck Script',
  label: 'Marck Script ✨'
}, {
  value: 'Cookie',
  label: 'Cookie ✨'
}, {
  value: 'Sacramento',
  label: 'Sacramento ✨'
}, {
  value: 'Kaushan Script',
  label: 'Kaushan Script ✨'
}, {
  value: 'Courgette',
  label: 'Courgette ✨'
}, {
  value: 'Yellowtail',
  label: 'Yellowtail ✨'
}, {
  value: 'Dancing Script',
  label: 'Dancing Script ✨'
}, {
  value: 'Great Vibes',
  label: 'Great Vibes ✨'
}, {
  value: 'Amatic SC',
  label: 'Amatic SC ✨'
},
// Classic Serif Fonts
{
  value: 'Playfair Display',
  label: 'Playfair Display'
}, {
  value: 'Cormorant',
  label: 'Cormorant'
}, {
  value: 'Crimson Text',
  label: 'Crimson Text'
}, {
  value: 'Lora',
  label: 'Lora'
}, {
  value: 'Merriweather',
  label: 'Merriweather'
}, {
  value: 'EB Garamond',
  label: 'EB Garamond'
}, {
  value: 'Libre Baskerville',
  label: 'Libre Baskerville'
}, {
  value: 'Vollkorn',
  label: 'Vollkorn'
},
// Modern Sans-Serif Fonts
{
  value: 'Raleway',
  label: 'Raleway'
}, {
  value: 'Josefin Sans',
  label: 'Josefin Sans'
}, {
  value: 'Quicksand',
  label: 'Quicksand'
}, {
  value: 'Nunito',
  label: 'Nunito'
}, {
  value: 'Work Sans',
  label: 'Work Sans'
}, {
  value: 'DM Sans',
  label: 'DM Sans'
}, {
  value: 'Outfit',
  label: 'Outfit'
}, {
  value: 'Montserrat',
  label: 'Montserrat'
}, {
  value: 'Poppins',
  label: 'Poppins'
}, {
  value: 'Inter',
  label: 'Inter'
}, {
  value: 'Roboto',
  label: 'Roboto'
}, {
  value: 'Open Sans',
  label: 'Open Sans'
}, {
  value: 'Lato',
  label: 'Lato'
},
// Display & Decorative Fonts
{
  value: 'Cinzel',
  label: 'Cinzel ◆'
}, {
  value: 'Abril Fatface',
  label: 'Abril Fatface ◆'
}, {
  value: 'Bebas Neue',
  label: 'Bebas Neue ◆'
}, {
  value: 'Righteous',
  label: 'Righteous ◆'
}, {
  value: 'Pacifico',
  label: 'Pacifico ◆'
}].sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));

export const PlaceCardCustomizer: React.FC<PlaceCardCustomizerProps> = ({
  settings,
  onSettingsChange,
  guests
}) => {
  const [individualMessages, setIndividualMessages] = useState<Record<string, string>>(settings?.individual_messages || {});
  const [uploading, setUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const {
    toast
  } = useToast();
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
    guest_font_family: 'Inter',
    info_font_family: 'Inter',
    guest_name_bold: false,
    guest_name_italic: false,
    guest_name_underline: false,
    guest_name_font_size: 24,
    info_font_size: 12,
    name_spacing: 4
  };
  const handleSettingChange = async (key: keyof PlaceCardSettings, value: any) => {
    await onSettingsChange({
      [key]: value
    });
  };
  const handleIndividualMessageChange = (guestId: string, message: string) => {
    const newMessages = {
      ...individualMessages,
      [guestId]: message
    };
    setIndividualMessages(newMessages);
  };
  const saveIndividualMessages = async () => {
    await onSettingsChange({
      individual_messages: individualMessages
    });
  };

  const handleResetToDefaults = async () => {
    const defaultSettings = {
      font_family: 'Arial',
      font_color: '#000000',
      background_color: '#ffffff',
      background_image_url: null,
      background_image_type: 'none' as const,
      mass_message: '',
      individual_messages: {},
      guest_font_family: 'Arial',
      info_font_family: 'Arial',
      guest_name_bold: false,
      guest_name_italic: false,
      guest_name_underline: false,
      guest_name_font_size: 24,
      info_font_size: 12,
      name_spacing: 4
    };
    
    setIndividualMessages({});
    await onSettingsChange(defaultSettings);
    
    toast({
      title: "Settings Reset",
      description: "All place card settings have been reset to defaults"
    });
  };
  const applyTemplate = async (templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) return;
    setSelectedTemplate(templateId);

    // Apply template styles
    await onSettingsChange({
      font_family: template.styles.font_family,
      font_color: template.styles.font_color,
      background_color: template.styles.background_color
    });
    toast({
      title: "Template Applied",
      description: `${template.name} template has been applied`
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
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be smaller than 5MB",
        variant: "destructive"
      });
      return;
    }
    setUploading(true);
    try {
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `place-card-bg-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/place-cards/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('qr-assets').upload(filePath, file);
      if (uploadError) {
        throw uploadError;
      }
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('qr-assets').getPublicUrl(filePath);
      await handleSettingChange('background_image_url', publicUrl);
      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 py-[10px]">
          <Palette className="h-5 w-5" />
          Customise Name Place Cards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="design" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="background">Background</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="design" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Type className="h-4 w-4" />
                  Guest Name Font
                </Label>
                <Select value={currentSettings.guest_font_family} onValueChange={value => handleSettingChange('guest_font_family', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(font => <SelectItem key={font.value} value={font.value}>
                        <span style={{
                      fontFamily: font.value
                    }}>{font.label}</span>
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Type className="h-4 w-4" />
                  Table, Seat & Message Font
                </Label>
                <Select value={currentSettings.info_font_family} onValueChange={value => handleSettingChange('info_font_family', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(font => <SelectItem key={font.value} value={font.value}>
                        <span style={{
                      fontFamily: font.value
                    }}>{font.label}</span>
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold">Guest Name Styling</Label>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="bold-toggle" className="text-sm">Bold</Label>
                  <Switch 
                    id="bold-toggle"
                    checked={currentSettings.guest_name_bold} 
                    onCheckedChange={value => handleSettingChange('guest_name_bold', value)} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="italic-toggle" className="text-sm">Italic</Label>
                  <Switch 
                    id="italic-toggle"
                    checked={currentSettings.guest_name_italic} 
                    onCheckedChange={value => handleSettingChange('guest_name_italic', value)} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="underline-toggle" className="text-sm">Underline</Label>
                  <Switch 
                    id="underline-toggle"
                    checked={currentSettings.guest_name_underline} 
                    onCheckedChange={value => handleSettingChange('guest_name_underline', value)} 
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  Guest Name Font Size
                </Label>
                <Select 
                  value={currentSettings.guest_name_font_size.toString()} 
                  onValueChange={(value) => handleSettingChange('guest_name_font_size', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48].map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}pt
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  Table & Seat Info Font Size
                </Label>
                <Select 
                  value={currentSettings.info_font_size.toString()} 
                  onValueChange={(value) => handleSettingChange('info_font_size', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24].map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}pt
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
                <ColorPickerPopover
                  value={currentSettings.font_color}
                  onChange={(color) => handleSettingChange('font_color', color)}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4" />
                  Card Background Color
                </Label>
                <div className="flex items-center gap-2">
                  <Input type="color" value={currentSettings.background_color} onChange={e => handleSettingChange('background_color', e.target.value)} className="w-12 h-10 p-1" />
                  <Input type="text" value={currentSettings.background_color} onChange={e => handleSettingChange('background_color', e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="background" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4" />
                  Background Color
                </Label>
                <ColorPickerPopover
                  value={currentSettings.background_color}
                  onChange={(color) => handleSettingChange('background_color', color)}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Image className="h-4 w-4" />
                  Background Image
                </Label>
                <RadioGroup value={currentSettings.background_image_type} onValueChange={(value: 'none' | 'decorative' | 'full') => handleSettingChange('background_image_type', value)} className="space-y-3">
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

              {currentSettings.background_image_type !== 'none' && <div>
                  <Label className="mb-2 block">Upload Background Image</Label>
                  <div className="space-y-2">
                    <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                    {currentSettings.background_image_url && <div className="mt-2">
                        <img src={currentSettings.background_image_url} alt="Background preview" className="w-20 h-20 object-cover rounded border" />
                      </div>}
                  </div>
                </div>}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4" />
                  Mass Message (applies to all cards)
                </Label>
                <Textarea placeholder="Enter a message for all place cards..." value={currentSettings.mass_message} onChange={e => handleSettingChange('mass_message', e.target.value)} rows={3} />
              </div>

              <div>
                <Label className="mb-3 block">Individual Messages</Label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {guests.map(guest => <div key={guest.id} className="p-3 border rounded-lg">
                      <Label className="text-sm font-medium mb-1 block">
                        {guest.first_name} {guest.last_name}
                      </Label>
                      <Input placeholder="Personal message for this guest..." value={individualMessages[guest.id] || ''} onChange={e => handleIndividualMessageChange(guest.id, e.target.value)} />
                    </div>)}
                </div>
                {guests.length > 0 && <Button onClick={saveIndividualMessages} variant="outline" className="w-full mt-3">
                    Save Individual Messages
                  </Button>}
              </div>
            </div>
            </TabsContent>
          
          <div className="pt-4 border-t">
            <Button 
              onClick={handleResetToDefaults} 
              variant="outline" 
              className="w-full"
            >
              Reset to Default
            </Button>
          </div>
        </Tabs>
      </CardContent>
    </Card>;
};