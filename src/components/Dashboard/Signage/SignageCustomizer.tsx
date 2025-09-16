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
import { ArrowLeft, Download, Eye, Save } from "lucide-react";
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

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const mockGuestLookupUrl = `https://seatingchart.example.com/s/${currentTemplate.eventId}`;
      
      // Generate PDF
      const pdfBlob = await templateEngine.exportToPDF(currentTemplate, mockGuestLookupUrl);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTemplate.name.replace(/\s+/g, '_').toLowerCase()}_signage.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Signage downloaded successfully!');
    } catch (error) {
      console.error('Error downloading signage:', error);
      toast.error('Failed to download signage');
    } finally {
      setIsGenerating(false);
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
                <Label htmlFor="customMessage">Custom Message (Optional)</Label>
                <Textarea
                  id="customMessage"
                  value={settings.customMessage}
                  onChange={(e) => handleSettingChange('customMessage', e.target.value)}
                  placeholder="Add a personal message"
                  rows={3}
                />
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
              {currentTemplate.dimensions.width} × {currentTemplate.dimensions.height} {currentTemplate.dimensions.units}
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