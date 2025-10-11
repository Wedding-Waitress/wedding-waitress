import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { MEDIA_THEMES, MediaThemeId } from '@/lib/mediaConstants';
import { cn } from '@/lib/utils';

interface TextPostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { textContent: string; themeId: string }) => void;
}

export const TextPostModal: React.FC<TextPostModalProps> = ({ open, onClose, onSubmit }) => {
  const [textContent, setTextContent] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<MediaThemeId>('confetti');

  const themes = Object.values(MEDIA_THEMES);
  const currentTheme = MEDIA_THEMES[selectedTheme];

  const handleSubmit = () => {
    if (!textContent.trim()) return;
    onSubmit({ textContent, themeId: selectedTheme });
    setTextContent('');
    setSelectedTheme('confetti');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add a Text Message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Theme Selection */}
          <div>
            <Label className="text-base mb-3 block">Choose a theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id as MediaThemeId)}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all hover:scale-105",
                    selectedTheme === theme.id 
                      ? "border-primary ring-2 ring-primary/20" 
                      : "border-border hover:border-primary/30"
                  )}
                  style={{ background: theme.bgColor }}
                >
                  <div className="text-2xl mb-2">{theme.emoji}</div>
                  <div 
                    className="text-sm font-medium" 
                    style={{ color: theme.textColor }}
                  >
                    {theme.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Text Input */}
          <div>
            <Label className="text-base mb-2 block">Your message</Label>
            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Share your thoughts, wishes, or memories..."
              rows={6}
              className="text-lg resize-none"
              maxLength={500}
            />
            <p className="text-sm text-muted-foreground mt-2">
              {textContent.length}/500 characters
            </p>
          </div>

          {/* Preview */}
          <div>
            <Label className="text-base mb-2 block">Preview</Label>
            <Card 
              className="p-8 min-h-[200px] flex items-center justify-center border-2"
              style={{ background: currentTheme.bgColor }}
            >
              <p 
                className="text-xl text-center font-medium break-words max-w-full px-4"
                style={{ color: currentTheme.textColor }}
              >
                {textContent || 'Your message will appear here...'}
              </p>
            </Card>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              type="button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
              onClick={handleSubmit}
              disabled={!textContent.trim()}
              type="button"
            >
              Add to Album
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
