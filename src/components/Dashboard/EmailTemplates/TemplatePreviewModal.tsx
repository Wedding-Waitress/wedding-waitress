import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Smartphone, ZoomIn, ZoomOut, Check, Edit } from 'lucide-react';

interface TemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateHtml: string;
  templateName: string;
  onUse: () => void;
  onCustomize?: () => void;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  open,
  onOpenChange,
  templateHtml,
  templateName,
  onUse,
  onCustomize,
}) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Preview: {templateName}</DialogTitle>
            
            {/* View Controls */}
            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2 border rounded-md p-1">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium min-w-[3rem] text-center">{zoom}%</span>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              {/* Device Toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="desktop" className="gap-2">
                    <Monitor className="w-4 h-4" />
                    Desktop
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="gap-2">
                    <Smartphone className="w-4 h-4" />
                    Mobile
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </DialogHeader>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-4 flex items-center justify-center">
          <div
            className={`bg-white shadow-2xl transition-all duration-300 ${
              viewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-[800px]'
            } w-full`}
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
          >
            <iframe
              srcDoc={templateHtml}
              className="w-full border-0"
              style={{ height: '600px' }}
              title="Email Preview"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex justify-between gap-3 pt-4 border-t">
          <div className="flex gap-2">
            {onCustomize && (
              <Button variant="outline" onClick={onCustomize}>
                <Edit className="w-4 h-4 mr-2" />
                Customize & Save
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={onUse} className="bg-gradient-to-r from-primary to-purple-600">
              <Check className="w-4 h-4 mr-2" />
              Use This Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
