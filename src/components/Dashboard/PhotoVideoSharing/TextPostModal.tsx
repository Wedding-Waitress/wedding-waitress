import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MEDIA_THEMES, MediaThemeId } from '@/lib/mediaConstants';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface TextPostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { textContent: string; themeId: string }) => void;
}

export const TextPostModal: React.FC<TextPostModalProps> = ({ open, onClose, onSubmit }) => {
  const [textContent, setTextContent] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<MediaThemeId>('yellow');
  const [previewOpen, setPreviewOpen] = useState(false);

  const themes = Object.values(MEDIA_THEMES);
  const currentTheme = MEDIA_THEMES[selectedTheme];

  const handleSubmit = () => {
    if (!textContent.trim()) return;
    onSubmit({ textContent, themeId: selectedTheme });
    setTextContent('');
    setSelectedTheme('yellow');
    setPreviewOpen(false);
    onClose();
  };

  const getThemeStyle = (theme: typeof currentTheme) => {
    const style: React.CSSProperties = {
      background: theme.bgColor,
      color: theme.textColor,
    };

    // Add pattern decorations
    if (theme.pattern === 'confetti') {
      style.backgroundImage = `radial-gradient(circle at 20% 30%, rgba(255, 200, 100, 0.15) 2px, transparent 2px),
                                radial-gradient(circle at 80% 70%, rgba(255, 150, 200, 0.15) 2px, transparent 2px),
                                radial-gradient(circle at 50% 50%, rgba(100, 200, 255, 0.15) 2px, transparent 2px)`;
      style.backgroundSize = '40px 40px';
    } else if (theme.pattern === 'glow') {
      style.background = `radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.3) 0%, ${theme.bgColor} 60%)`;
    } else if (theme.pattern === 'ribbons') {
      style.backgroundImage = `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255, 255, 255, 0.06) 20px, rgba(255, 255, 255, 0.06) 40px)`;
    } else if (theme.pattern === 'hearts') {
      style.backgroundImage = `radial-gradient(circle at 30% 40%, rgba(255, 100, 150, 0.08) 8px, transparent 8px),
                                radial-gradient(circle at 70% 60%, rgba(255, 100, 150, 0.08) 8px, transparent 8px)`;
      style.backgroundSize = '60px 60px';
    } else if (theme.pattern === 'wave') {
      style.backgroundImage = `${theme.bgColor}, url("data:image/svg+xml,%3Csvg width='100' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,10 Q25,5 50,10 T100,10' stroke='rgba(255,255,255,0.3)' fill='none' stroke-width='2'/%3E%3C/svg%3E")`;
      style.backgroundPosition = 'center, bottom';
      style.backgroundRepeat = 'no-repeat, repeat-x';
    } else if (theme.pattern === 'clouds') {
      style.backgroundImage = `${theme.bgColor}, radial-gradient(ellipse at 30% 40%, rgba(255, 255, 255, 0.4) 20px, transparent 50px),
                                radial-gradient(ellipse at 70% 60%, rgba(255, 255, 255, 0.3) 30px, transparent 60px)`;
    }

    return style;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[100vh] overflow-hidden p-0">
        <div className="flex flex-col h-full max-h-[100vh]">
          <DialogHeader className="px-4 pt-3 pb-2">
            <DialogTitle className="text-lg">Add a Text Message</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
            {/* Theme Selection - 2x3 Grid */}
            <div>
              <Label className="text-sm mb-2 block">Choose a theme</Label>
              <div className="grid grid-cols-2 gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id as MediaThemeId)}
                    className={cn(
                      "relative p-3 rounded-xl border-2 transition-all hover:scale-[1.02]",
                      "min-w-[110px] min-h-[92px] flex flex-col items-center justify-between",
                      selectedTheme === theme.id 
                        ? "shadow-[0_0_0_3px_rgba(109,40,217,0.15)]"
                        : "hover:border-[#6D28D9]/30"
                    )}
                    style={{ 
                      ...getThemeStyle(theme),
                      borderColor: selectedTheme === theme.id ? '#6D28D9' : '#E5E7EB',
                      boxShadow: selectedTheme === theme.id ? '0 0 0 3px rgba(109,40,217,0.15), 0 1px 2px rgba(0,0,0,0.05)' : '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    {/* Emoji at top-left */}
                    <div className="absolute top-2 left-2 text-xl">{theme.emoji}</div>
                    
                    {/* Checkmark at top-right when selected */}
                    {selectedTheme === theme.id && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4" style={{ color: theme.textColor }} />
                      </div>
                    )}
                    
                    {/* Theme name at bottom */}
                    <div 
                      className="text-sm font-semibold mt-auto" 
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
              <Label className="text-sm mb-1 block">Your message</Label>
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Share your thoughts, wishes, or memories..."
                rows={2}
                className="text-base resize-none max-h-[120px]"
                maxLength={500}
                style={{ minHeight: '60px' }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {textContent.length}/500
              </p>
            </div>

            {/* Collapsible Preview */}
            <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                <ChevronDown className={cn("w-4 h-4 transition-transform", previewOpen && "rotate-180")} />
                Preview
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <Card 
                  className="p-6 min-h-[140px] flex items-center justify-center border-2"
                  style={getThemeStyle(currentTheme)}
                >
                  <p 
                    className="text-lg text-center font-medium break-words max-w-full"
                    style={{ color: currentTheme.textColor }}
                  >
                    {textContent || 'Your message will appear here...'}
                  </p>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Sticky Action Buttons */}
          <div className="sticky bottom-0 bg-background border-t px-4 py-3 flex gap-2 safe-area-bottom">
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="flex-1"
              type="button"
            >
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: '#6D28D9', color: 'white' }}
              className="flex-1 hover:opacity-90"
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
