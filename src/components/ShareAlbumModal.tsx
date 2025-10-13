import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareAlbumModalProps {
  open: boolean;
  onClose: () => void;
  galleryUrl: string;
  galleryTitle: string;
}

export const ShareAlbumModal: React.FC<ShareAlbumModalProps> = ({
  open,
  onClose,
  galleryUrl,
  galleryTitle,
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl);
      setCopied(true);
      toast({
        title: '✅ Gallery link copied!',
        description: 'Share link has been copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Copy failed',
        description: 'Could not copy link. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Share Gallery</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this gallery with friends and family
          </p>
          
          <div className="flex gap-2">
            <Input
              value={galleryUrl}
              readOnly
              className="flex-1 font-mono text-sm"
            />
            <Button
              onClick={handleCopyLink}
              size="icon"
              variant={copied ? 'default' : 'outline'}
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <strong>{galleryTitle}</strong> - View the full album of photos & videos
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
