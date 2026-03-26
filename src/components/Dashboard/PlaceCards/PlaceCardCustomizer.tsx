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
import canvaEditBanner from '@/assets/canva-edit-banner.png';
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
  textEditMode?: boolean;
  onTextEditModeChange?: (enabled: boolean) => void;
}

interface ExtendedPlaceCardSettings extends PlaceCardSettings {
  template_id?: string;
}

// FONT_OPTIONS removed — replaced by PlaceCardFontPicker with 1,500+ Google Fonts

export const PlaceCardCustomizer: React.FC<PlaceCardCustomizerProps> = ({
  settings,
  onSettingsChange,
  guests,
  textEditMode = false,
  onTextEditModeChange,
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
    guest_font_family: 'Great Vibes',
    info_font_family: 'Beauty Mountains',
    guest_name_bold: false,
    guest_name_italic: false,
    guest_name_underline: false,
    guest_name_font_size: 30,
    info_font_size: 16,
    name_spacing: 4,
    background_behind_names: false,
    background_behind_table_seats: false,
    info_bold: false,
    info_italic: false,
    info_underline: false,
    info_font_color: '#000000'
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
      guest_font_family: 'Great Vibes',
      info_font_family: 'Beauty Mountains',
      guest_name_bold: false,
      guest_name_italic: false,
      guest_name_underline: false,
      guest_name_font_size: 30,
      info_font_size: 16,
      name_spacing: 4,
      font_color: '#000000',
      info_bold: false,
      info_italic: false,
      info_underline: false,
      info_font_color: '#000000'
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
              {/* Box 1 — Guest Name */}
              <div className="border-[1.5px] border-primary rounded-xl bg-white p-4 space-y-3">
                <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Guest Name</span>
                
                {/* Row 1: Font + Font Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Font</Label>
                    <PlaceCardFontPicker
                      value={currentSettings.guest_font_family || 'Great Vibes'}
                      onValueChange={value => handleSettingChange('guest_font_family', value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Font Size</Label>
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
                </div>

                {/* Row 2: Text Styling + Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Text Style</Label>
                    <Select
                      value={currentSettings.guest_name_bold ? 'bold' : currentSettings.guest_name_italic ? 'italic' : currentSettings.guest_name_underline ? 'underline' : 'default'}
                      onValueChange={(value) => {
                        handleSettingChange('guest_name_bold', value === 'bold');
                        handleSettingChange('guest_name_italic', value === 'italic');
                        handleSettingChange('guest_name_underline', value === 'underline');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                        <SelectItem value="italic">Italic</SelectItem>
                        <SelectItem value="underline">Underline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Color</Label>
                    <ColorPickerPopover
                      value={currentSettings.font_color}
                      onChange={(color) => handleSettingChange('font_color', color)}
                    />
                  </div>
                </div>
              </div>

              {/* Box 2 — Table & Seat */}
              <div className="border-[1.5px] border-primary rounded-xl bg-white p-4 space-y-3">
                <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Table & Seat</span>
                
                {/* Row 1: Font + Font Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Font</Label>
                    <PlaceCardFontPicker
                      value={currentSettings.info_font_family || 'Beauty Mountains'}
                      onValueChange={value => handleSettingChange('info_font_family', value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Font Size</Label>
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
                </div>

                {/* Row 2: Text Styling + Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Text Style</Label>
                    <Select
                      value={currentSettings.info_bold ? 'bold' : currentSettings.info_italic ? 'italic' : currentSettings.info_underline ? 'underline' : 'default'}
                      onValueChange={(value) => {
                        handleSettingChange('info_bold', value === 'bold');
                        handleSettingChange('info_italic', value === 'italic');
                        handleSettingChange('info_underline', value === 'underline');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                        <SelectItem value="italic">Italic</SelectItem>
                        <SelectItem value="underline">Underline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Color</Label>
                    <ColorPickerPopover
                      value={(currentSettings as any).info_font_color || '#000000'}
                      onChange={(color) => handleSettingChange('info_font_color' as any, color)}
                    />
                  </div>
                </div>
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
              {/* Text Edit Mode container */}
              <div className="border-[1.5px] border-primary rounded-xl bg-white p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center gap-2 text-sm font-semibold">
                      <Type className="h-4 w-4" />
                      Text Edit Mode
                    </span>
                  </div>
                  <Switch
                    checked={textEditMode}
                    onCheckedChange={(checked) => onTextEditModeChange?.(checked)}
                    className="data-[state=unchecked]:bg-destructive"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enable Text Edit Mode above, then drag text elements directly on the card preview to reposition them.
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={async () => {
                    await onSettingsChange({
                      guest_name_offset_x: 0,
                      guest_name_offset_y: 0,
                      table_offset_x: 0,
                      table_offset_y: 0,
                      seat_offset_x: 0,
                      seat_offset_y: 0,
                      guest_name_rotation: 0,
                      table_seat_rotation: 0,
                      guest_name_font_size: 30,
                      info_font_size: 16,
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
                <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center gap-2 text-sm font-semibold mb-3">
                  <Image className="h-4 w-4" />
                  Background Image
                </span>
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
                      <img
                        src={canvaEditBanner}
                        alt="Edit with Canva"
                        className="h-12 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open('https://www.canva.com', '_blank')}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Want more design freedom? Click 'Edit with Canva' to customise your place card using Canva. After downloading your design as PNG or PDF, return here and upload it to Wedding Waitress.
                    </p>
                    
                    {/* Image preview, recommendation text, and remove button */}
                    {currentSettings.background_image_url && (
                      <div className="mt-2 space-y-2">
                        <img src={currentSettings.background_image_url} alt="Background preview" className="w-full h-auto object-contain rounded border max-h-32" />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Image className="h-4 w-4" />
                          <span>We recommend using a horizontal (landscape orientation) photo or Logo for best result.</span>
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
                <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Card Background Color</span>
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
                <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4" />
                  Mass Message (applies to all cards)
                </span>
                <Textarea placeholder="Enter a message for all place cards..." value={localMassMessage} onChange={e => setLocalMassMessage(e.target.value)} rows={3} />
                <Button onClick={saveMassMessage} variant="success" className="w-full rounded-full">
                  Save Mass Message
                </Button>
              </div>

              <div className="p-4 border-2 border-accent-foreground rounded-xl space-y-3">
                <span className="text-primary border border-primary rounded-full px-3 py-0.5 inline-flex items-center text-sm font-semibold">Individual Messages</span>
                
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