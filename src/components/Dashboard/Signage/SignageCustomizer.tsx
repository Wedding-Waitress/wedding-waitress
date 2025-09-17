import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Download, Eye, Save, Upload, Image as ImageIcon } from "lucide-react";
import { SignageTemplate, SignageTemplateEngine } from '@/lib/signageTemplateEngine';
import { toast } from "sonner";

interface SignageCustomizerProps {
  template: SignageTemplate;
  onBack: () => void;
  onSave: (template: SignageTemplate) => void;
}

export const SignageCustomizer: React.FC<SignageCustomizerProps> = ({
  template,
  onBack,
  onSave
}) => {
  const [currentTemplate, setCurrentTemplate] = useState<SignageTemplate>(template);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateEngine] = useState(() => new SignageTemplateEngine());
  const [uploadingImage, setUploadingImage] = useState<'header' | 'background' | null>(null);

  // Generate preview when template changes
  useEffect(() => {
    generatePreview();
  }, [currentTemplate]);

  const generatePreview = async () => {
    try {
      setIsGenerating(true);
      const mockGuestLookupUrl = `https://seatingchart.example.com/s/${currentTemplate.eventId}`;
      const dataUrl = await templateEngine.generateTemplate(currentTemplate, mockGuestLookupUrl);
      setPreviewUrl(dataUrl);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSettingChange = (key: keyof SignageTemplate['settings'], value: any) => {
    setCurrentTemplate(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      },
      updatedAt: new Date()
    }));
  };

  const handleSave = () => {
    onSave(currentTemplate);
    toast.success('Template saved successfully!');
  };

  const handleImageUpload = (type: 'header' | 'background') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setUploadingImage(type);
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          if (type === 'header') {
            handleSettingChange('headerImageUrl', imageUrl);
          } else {
            handleSettingChange('backgroundImageUrl', imageUrl);
          }
          setUploadingImage(null);
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const mockGuestLookupUrl = `https://seatingchart.example.com/s/${currentTemplate.eventId}`;
      
      // Update template dimensions based on paper size
      const paperDimensions = getPaperDimensions(currentTemplate.settings.paperSize);
      const updatedTemplate = {
        ...currentTemplate,
        dimensions: {
          width: paperDimensions.width,
          height: paperDimensions.height,
          units: 'mm' as const
        }
      };
      
      // Generate PDF
      const pdfBlob = await templateEngine.exportToPDF(updatedTemplate, mockGuestLookupUrl);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTemplate.name.replace(/\s+/g, '_').toLowerCase()}_${currentTemplate.settings.paperSize}_signage.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Signage downloaded successfully in ${currentTemplate.settings.paperSize} format!`);
    } catch (error) {
      console.error('Error downloading signage:', error);
      toast.error('Failed to download signage');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPaperDimensions = (paperSize: string): { width: number; height: number } => {
    switch (paperSize) {
      case 'A5': return { width: 148, height: 210 };
      case 'A4': return { width: 210, height: 297 };
      case 'A3': return { width: 297, height: 420 };
      case 'A2': return { width: 420, height: 594 };
      case 'A1': return { width: 594, height: 841 };
      case 'A0': return { width: 841, height: 1189 };
      default: return { width: 210, height: 297 };
    }
  };

  const { settings } = currentTemplate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <CardTitle>Customize {currentTemplate.name}</CardTitle>
                <CardDescription>
                  Personalize your signage template
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload} disabled={isGenerating}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="gradient" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customization Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Customization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Event Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name</Label>
                <Input
                  id="eventName"
                  value={settings.eventName}
                  onChange={(e) => handleSettingChange('eventName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventVenue">Venue (Optional)</Label>
                <Input
                  id="eventVenue"
                  value={settings.eventVenue}
                  onChange={(e) => handleSettingChange('eventVenue', e.target.value)}
                  placeholder="Enter venue name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customMessage">Welcome Message</Label>
                <Textarea
                  id="customMessage"
                  value={settings.customMessage}
                  onChange={(e) => handleSettingChange('customMessage', e.target.value)}
                  placeholder="Add a welcome message for your guests"
                  rows={3}
                />
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Images</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Header Image</Label>
                  <Button
                    variant="outline"
                    onClick={() => handleImageUpload('header')}
                    disabled={uploadingImage === 'header'}
                    className="w-full h-20 flex flex-col gap-1"
                  >
                    {uploadingImage === 'header' ? (
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span className="text-xs">Upload Header Image</span>
                      </>
                    )}
                  </Button>
                  {settings.headerImageUrl && (
                    <div className="text-xs text-green-600">✓ Header image uploaded</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Background Image</Label>
                  <Button
                    variant="outline"
                    onClick={() => handleImageUpload('background')}
                    disabled={uploadingImage === 'background'}
                    className="w-full h-20 flex flex-col gap-1"
                  >
                    {uploadingImage === 'background' ? (
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-xs">Upload Background</span>
                      </>
                    )}
                  </Button>
                  {settings.backgroundImageUrl && (
                    <div className="text-xs text-green-600">✓ Background image uploaded</div>
                  )}
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Appearance</h3>
              
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.primaryColor}
                    onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.secondaryColor}
                    onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="textColor">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="textColor"
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => handleSettingChange('textColor', e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.textColor}
                    onChange={(e) => handleSettingChange('textColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family</Label>
                <Select 
                  value={settings.fontFamily} 
                  onValueChange={(value: 'Arial' | 'Georgia' | 'Times' | 'Helvetica' | 'Garamond' | 'Poppins') => handleSettingChange('fontFamily', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Times">Times New Roman</SelectItem>
                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                    <SelectItem value="Garamond">Garamond</SelectItem>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontSize">Font Size</Label>
                <Select 
                  value={settings.fontSize} 
                  onValueChange={(value: 'small' | 'medium' | 'large') => handleSettingChange('fontSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="textAlignment">Text Alignment</Label>
                <Select 
                  value={settings.textAlignment} 
                  onValueChange={(value: 'left' | 'center' | 'right') => handleSettingChange('textAlignment', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paperSize">Paper Size</Label>
                <Select 
                  value={settings.paperSize} 
                  onValueChange={(value: 'A5' | 'A4' | 'A3' | 'A2' | 'A1' | 'A0') => handleSettingChange('paperSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
                    <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                    <SelectItem value="A2">A2 (420 × 594 mm)</SelectItem>
                    <SelectItem value="A1">A1 (594 × 841 mm)</SelectItem>
                    <SelectItem value="A0">A0 (841 × 1189 mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="includeQR">Include QR Code</Label>
                <Switch
                  id="includeQR"
                  checked={settings.includeQR}
                  onCheckedChange={(checked) => handleSettingChange('includeQR', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview
            </CardTitle>
            <CardDescription>
              {settings.paperSize} - High Resolution Print Ready
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/20 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
              {isGenerating ? (
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Generating preview...</p>
                </div>
              ) : previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Template preview" 
                  className="max-w-full max-h-[500px] object-contain rounded-md shadow-lg"
                />
              ) : (
                <p className="text-muted-foreground">Preview will appear here</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};