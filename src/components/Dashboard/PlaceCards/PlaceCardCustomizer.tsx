/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Place Cards feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated 300 DPI export system.
 * 
 * Last completed: 2025-10-04
 */

import React, { useState, useEffect } from 'react';
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
import { Palette, Type, Image, MessageSquare, Sparkles, Grid3X3, Trash2, Upload, Images } from 'lucide-react';
import { PlaceCardGalleryModal } from './PlaceCardGalleryModal';
import { PlaceCardFontPicker } from './PlaceCardFontPicker';
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

// FONT_OPTIONS removed — replaced by PlaceCardFontPicker with 1,500+ Google Fonts

export const PlaceCardCustomizer: React.FC<PlaceCardCustomizerProps> = ({
  settings,
  onSettingsChange,
  guests
}) => {
  const [individualMessages, setIndividualMessages] = useState<Record<string, string>>(settings?.individual_messages || {});
  const [uploading, setUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [localMassMessage, setLocalMassMessage] = useState<string>(settings?.mass_message || '');
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const {
    toast
  } = useToast();

  // Sync local mass message with settings changes
  useEffect(() => {
    setLocalMassMessage(settings?.mass_message || '');
  }, [settings?.mass_message]);

  // Local state for position sliders (deferred save on release)
  const [localGuestNameOffsetX, setLocalGuestNameOffsetX] = useState(0);
  const [localGuestNameOffsetY, setLocalGuestNameOffsetY] = useState(0);
  const [localTableOffsetX, setLocalTableOffsetX] = useState(0);
  const [localTableOffsetY, setLocalTableOffsetY] = useState(0);

  useEffect(() => {
    setLocalGuestNameOffsetX(Number(settings?.guest_name_offset_x ?? 0));
    setLocalGuestNameOffsetY(Number(settings?.guest_name_offset_y ?? 0));
    setLocalTableOffsetX(Number(settings?.table_offset_x ?? 0));
    setLocalTableOffsetY(Number(settings?.table_offset_y ?? 0));
  }, [settings?.guest_name_offset_x, settings?.guest_name_offset_y, settings?.table_offset_x, settings?.table_offset_y]);

  const currentSettings = settings || {
    event_id: '',
    user_id: '',
    font_family: 'Inter',
    font_color: '#000000',
    background_color: '#ffffff',
    background_image_url: null,
    background_image_type: 'none' as const,
    background_image_x_position: 50,
    background_image_y_position: 50,
    background_image_scale: 100,
    background_image_opacity: 100,
    mass_message: '',
    individual_messages: {},
    guest_font_family: 'Inter',
    info_font_family: 'Inter',
    guest_name_bold: false,
    guest_name_italic: false,
    guest_name_underline: false,
    guest_name_font_size: 24,
    info_font_size: 12,
    name_spacing: 4,
    background_behind_names: false,
    background_behind_table_seats: false
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

  const saveMassMessage = async () => {
    await handleSettingChange('mass_message', localMassMessage);
    toast({
      title: "Success",
      description: "Mass message saved"
    });
  };

  const handleResetDesignDefaults = async () => {
    const designDefaults = {
      guest_font_family: 'Arial',
      info_font_family: 'Arial',
      guest_name_bold: false,
      guest_name_italic: false,
      guest_name_underline: false,
      guest_name_font_size: 24,
      info_font_size: 12,
      name_spacing: 4,
      font_color: '#000000'
    };
    
    await onSettingsChange(designDefaults);
    
    toast({
      title: "Design Settings Reset",
      description: "Design settings have been reset to defaults"
    });
  };

  const handleResetBackgroundDefaults = async () => {
    const backgroundDefaults = {
      background_color: '#ffffff',
      background_image_url: null,
      background_image_type: 'none' as const,
      background_image_x_position: 50,
      background_image_y_position: 50,
      background_image_opacity: 100
    };
    
    await onSettingsChange(backgroundDefaults);
    
    toast({
      title: "Background Settings Reset",
      description: "Background settings have been reset to defaults"
    });
  };

  const handleResetMessagesDefaults = async () => {
    const messagesDefaults = {
      mass_message: '',
      individual_messages: {}
    };
    
    setIndividualMessages({});
    setLocalMassMessage('');
    await onSettingsChange(messagesDefaults);
    
    toast({
      title: "Messages Reset",
      description: "All messages have been cleared"
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
  return <>
    <Card className="ww-box h-fit sticky top-0 mt-12 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 py-[10px] text-2xl font-medium text-[#7248e6]">
          <Palette className="h-5 w-5 text-purple-600" />
          Custom Name Place Cards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="design" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="position">Text Position</TabsTrigger>
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
                <PlaceCardFontPicker
                  value={currentSettings.guest_font_family || 'Inter'}
                  onValueChange={value => handleSettingChange('guest_font_family', value)}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Type className="h-4 w-4" />
                  Table, Seat & Message Font
                </Label>
                <PlaceCardFontPicker
                  value={currentSettings.info_font_family || 'Inter'}
                  onValueChange={value => handleSettingChange('info_font_family', value)}
                />
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

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleResetDesignDefaults} 
                  variant="destructive" 
                  className="w-full rounded-full"
                >
                  Reset to Default
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="position" className="space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Adjust the position of text elements. Changes apply to all cards.
              </p>

              {/* Guest Name Position */}
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold">Guest Name Position</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Horizontal</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={localGuestNameOffsetX}
                        min={-25}
                        max={25}
                        step={0.5}
                        className="h-6 w-[70px] text-xs text-right px-1"
                        onChange={(e) => {
                          const v = Math.min(25, Math.max(-25, parseFloat(e.target.value) || 0));
                          setLocalGuestNameOffsetX(v);
                        }}
                        onBlur={(e) => {
                          const v = Math.min(25, Math.max(-25, parseFloat(e.target.value) || 0));
                          onSettingsChange({ guest_name_offset_x: v });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = Math.min(25, Math.max(-25, parseFloat((e.target as HTMLInputElement).value) || 0));
                            onSettingsChange({ guest_name_offset_x: v });
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">mm</span>
                    </div>
                  </div>
                  <Slider
                    value={[localGuestNameOffsetX]}
                    min={-25}
                    max={25}
                    step={0.5}
                    onValueChange={([v]) => setLocalGuestNameOffsetX(v)}
                    onValueCommit={([v]) => onSettingsChange({ guest_name_offset_x: v })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Vertical</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={localGuestNameOffsetY}
                        min={-9}
                        max={25}
                        step={0.5}
                        className="h-6 w-[70px] text-xs text-right px-1"
                        onChange={(e) => {
                          const v = Math.min(25, Math.max(-9, parseFloat(e.target.value) || 0));
                          setLocalGuestNameOffsetY(v);
                        }}
                        onBlur={(e) => {
                          const v = Math.min(25, Math.max(-9, parseFloat(e.target.value) || 0));
                          onSettingsChange({ guest_name_offset_y: v });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = Math.min(25, Math.max(-9, parseFloat((e.target as HTMLInputElement).value) || 0));
                            onSettingsChange({ guest_name_offset_y: v });
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">mm</span>
                    </div>
                  </div>
                  <Slider
                    value={[localGuestNameOffsetY]}
                    min={-9}
                    max={25}
                    step={0.5}
                    onValueChange={([v]) => setLocalGuestNameOffsetY(v)}
                    onValueCommit={([v]) => onSettingsChange({ guest_name_offset_y: v })}
                  />
                </div>
              </div>

              {/* Table & Seat Number Position */}
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold">Table & Seat Number Position</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Horizontal</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={localTableOffsetX}
                        min={-25}
                        max={25}
                        step={0.5}
                        className="h-6 w-[70px] text-xs text-right px-1"
                        onChange={(e) => {
                          const v = Math.min(25, Math.max(-25, parseFloat(e.target.value) || 0));
                          setLocalTableOffsetX(v);
                        }}
                        onBlur={(e) => {
                          const v = Math.min(25, Math.max(-25, parseFloat(e.target.value) || 0));
                          onSettingsChange({ table_offset_x: v });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = Math.min(25, Math.max(-25, parseFloat((e.target as HTMLInputElement).value) || 0));
                            onSettingsChange({ table_offset_x: v });
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">mm</span>
                    </div>
                  </div>
                  <Slider
                    value={[localTableOffsetX]}
                    min={-25}
                    max={25}
                    step={0.5}
                    onValueChange={([v]) => setLocalTableOffsetX(v)}
                    onValueCommit={([v]) => onSettingsChange({ table_offset_x: v })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Vertical</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={localTableOffsetY}
                        min={-15}
                        max={15}
                        step={0.5}
                        className="h-6 w-[70px] text-xs text-right px-1"
                        onChange={(e) => {
                          const v = Math.min(15, Math.max(-15, parseFloat(e.target.value) || 0));
                          setLocalTableOffsetY(v);
                        }}
                        onBlur={(e) => {
                          const v = Math.min(15, Math.max(-15, parseFloat(e.target.value) || 0));
                          onSettingsChange({ table_offset_y: v });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = Math.min(15, Math.max(-15, parseFloat((e.target as HTMLInputElement).value) || 0));
                            onSettingsChange({ table_offset_y: v });
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground">mm</span>
                    </div>
                  </div>
                  <Slider
                    value={[localTableOffsetY]}
                    min={-15}
                    max={15}
                    step={0.5}
                    onValueChange={([v]) => setLocalTableOffsetY(v)}
                    onValueCommit={([v]) => onSettingsChange({ table_offset_y: v })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={async () => {
                    setLocalGuestNameOffsetX(0);
                    setLocalGuestNameOffsetY(0);
                    setLocalTableOffsetX(0);
                    setLocalTableOffsetY(0);
                    await onSettingsChange({
                      guest_name_offset_x: 0,
                      guest_name_offset_y: 0,
                      table_offset_x: 0,
                      table_offset_y: 0,
                      seat_offset_x: 0,
                      seat_offset_y: 0,
                    });
                    toast({
                      title: "Position Reset",
                      description: "All text positions have been reset to default"
                    });
                  }} 
                  variant="destructive" 
                  className="w-full rounded-full"
                >
                  Reset to Default
                </Button>
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
                <RadioGroup value={currentSettings.background_image_type} onValueChange={(value: 'none' | 'decorative' | 'full' | 'full_front' | 'full_back') => handleSettingChange('background_image_type', value)} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none">No background image</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="decorative" id="decorative" />
                    <Label htmlFor="decorative">Small image on front of card</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full">Full background image</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full_front" id="full_front" />
                    <Label htmlFor="full_front">Full front of card image</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full_back" id="full_back" />
                    <Label htmlFor="full_back">Full back of card image</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bg-names-toggle" className="text-sm">Add background behind names</Label>
                  <Switch 
                    id="bg-names-toggle"
                    checked={currentSettings.background_behind_names || false} 
                    onCheckedChange={value => handleSettingChange('background_behind_names', value)} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="bg-table-seats-toggle" className="text-sm">Add background behind tables & seats</Label>
                  <Switch 
                    id="bg-table-seats-toggle"
                    checked={currentSettings.background_behind_table_seats || false} 
                    onCheckedChange={value => handleSettingChange('background_behind_table_seats', value)} 
                  />
                </div>
              </div>

              {/* Standard background image upload for decorative, full, full_front and full_back modes */}
              {(currentSettings.background_image_type === 'decorative' || currentSettings.background_image_type === 'full' || currentSettings.background_image_type === 'full_front' || currentSettings.background_image_type === 'full_back') && <div>
                  <Label className="mb-2 block">Upload Background Image</Label>
                  <div className="space-y-2">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                      id="background-image-upload"
                    />
                    
                    {/* Side-by-side buttons */}
                    <div className="flex gap-2">
                      {/* Green "Choose File" button */}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => document.getElementById('background-image-upload')?.click()}
                        disabled={uploading}
                        className="flex-1 rounded-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Upload className="h-4 w-4" />
                        {uploading ? 'Uploading...' : 'Choose File'}
                      </Button>
                      
                      {/* Purple "Image Gallery" button */}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setGalleryModalOpen(true)}
                        className="flex-1 rounded-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Images className="h-4 w-4" />
                        Image Gallery
                      </Button>
                    </div>
                    
                    {/* Image preview, recommendation text, and remove button */}
                    {currentSettings.background_image_url && (
                      <div className="mt-2 space-y-2">
                        <img src={currentSettings.background_image_url} alt="Background preview" className="w-full h-auto object-contain rounded border max-h-32" />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Image className="h-4 w-4" />
                          <span>We recommend a horizontal photo or Logo</span>
                        </div>
                        {/* Red "Remove Image" button */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            await handleSettingChange('background_image_url', null);
                            toast({
                              title: "Image Removed",
                              description: "Background image has been removed"
                            });
                          }}
                          className="w-full rounded-full flex items-center justify-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove Image
                        </Button>
                      </div>
                    )}
                  </div>
                </div>}

              {/* Front and back card image modes now use the shared background_image_url upload above */}

              {currentSettings.background_image_type === 'full' && currentSettings.background_image_url && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-medium">Image Positioning</h4>
                  
                  {/* Horizontal Position Dropdown */}
                  <div className="space-y-2">
                    <Label>Horizontal Position</Label>
                    <Select
                      value={String(currentSettings.background_image_x_position || 50)}
                      onValueChange={(value) => handleSettingChange('background_image_x_position', Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
                          <SelectItem key={val} value={String(val)}>{val}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Vertical Position Dropdown */}
                  <div className="space-y-2">
                    <Label>Vertical Position</Label>
                    <Select
                      value={String(currentSettings.background_image_y_position || 50)}
                      onValueChange={(value) => handleSettingChange('background_image_y_position', Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
                          <SelectItem key={val} value={String(val)}>{val}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>


                  {/* Opacity Dropdown */}
                  <div className="space-y-2">
                    <Label>Image Opacity</Label>
                    <Select
                      value={String(currentSettings.background_image_opacity || 100)}
                      onValueChange={(value) => handleSettingChange('background_image_opacity', Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
                          <SelectItem key={val} value={String(val)}>{val}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <Label>Card Background Color</Label>
                <ColorPickerPopover
                  value={settings?.background_color || '#ffffff'}
                  onChange={(color) => handleSettingChange('background_color', color)}
                />
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleResetBackgroundDefaults} 
                  variant="destructive" 
                  className="w-full rounded-full"
                >
                  Reset to Default
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 border-2 border-accent-foreground rounded-xl space-y-3">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Mass Message (applies to all cards)
                </Label>
                <Textarea placeholder="Enter a message for all place cards..." value={localMassMessage} onChange={e => setLocalMassMessage(e.target.value)} rows={3} />
                <Button onClick={saveMassMessage} variant="success" className="w-full rounded-full">
                  Save Mass Message
                </Button>
              </div>

              <div className="p-4 border-2 border-accent-foreground rounded-xl space-y-3">
                <Label>Individual Messages</Label>
                
                <Button variant="success" className="w-full rounded-full">
                  Guest Name Search
                </Button>
                
                <Input
                  placeholder="Search for a guest..."
                  value={guestSearchQuery}
                  onChange={(e) => setGuestSearchQuery(e.target.value)}
                  className="w-full"
                />
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {(() => {
                    const filteredGuests = guests.filter(guest => {
                      if (!guestSearchQuery.trim()) return true;
                      const searchLower = guestSearchQuery.toLowerCase();
                      const fullName = `${guest.first_name} ${guest.last_name}`.toLowerCase();
                      return fullName.includes(searchLower);
                    });

                    if (filteredGuests.length === 0 && guestSearchQuery.trim() !== '') {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No guests found matching "{guestSearchQuery}"</p>
                          <p className="text-sm mt-2">Try a different search term</p>
                        </div>
                      );
                    }

                    return filteredGuests.map(guest => (
                      <div key={guest.id} className="p-3 border rounded-lg">
                        <Label className="text-sm font-medium mb-1 block">
                          {guest.first_name} {guest.last_name}
                        </Label>
                        <Input 
                          placeholder="Personal message for this guest..." 
                          value={individualMessages[guest.id] || ''} 
                          onChange={e => handleIndividualMessageChange(guest.id, e.target.value)} 
                        />
                      </div>
                    ));
                  })()}
                </div>
                {guests.length > 0 && <Button onClick={saveIndividualMessages} variant="success" className="w-full rounded-full">
                    Save Individual Messages
                  </Button>}
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleResetMessagesDefaults} 
                  variant="destructive" 
                  className="w-full rounded-full"
                >
                  Reset to Default
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    
    {/* Gallery Modal */}
    <PlaceCardGalleryModal
      open={galleryModalOpen}
      onOpenChange={setGalleryModalOpen}
      onSelectImage={async (imageUrl) => {
        await handleSettingChange('background_image_url', imageUrl);
        toast({
          title: "Image Selected",
          description: "Gallery image has been applied"
        });
      }}
    />
  </>;
};