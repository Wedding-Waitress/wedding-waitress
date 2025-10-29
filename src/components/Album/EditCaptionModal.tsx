import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EditCaptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCaption: string | null;
  onSave: (caption: string) => Promise<void>;
}

export const EditCaptionModal = ({
  isOpen,
  onClose,
  currentCaption,
  onSave,
}: EditCaptionModalProps) => {
  const [caption, setCaption] = useState(currentCaption || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(caption);
      onClose();
    } catch (error) {
      console.error('Failed to save caption:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Caption</DialogTitle>
          <DialogDescription>
            Add or edit a caption for this media item
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="caption">Caption</Label>
          <Textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Enter a caption..."
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Caption'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
