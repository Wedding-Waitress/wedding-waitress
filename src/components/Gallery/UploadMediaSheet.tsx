import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Camera, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { UploadProgress } from './UploadProgress';

interface GallerySettings {
  max_photo_size_mb: number;
  max_video_size_mb: number;
  allow_photos: boolean;
  allow_videos: boolean;
}

interface UploadMediaSheetProps {
  open: boolean;
  onClose: () => void;
  gallerySlug: string;
  eventId: string;
  settings: GallerySettings;
  requireApproval: boolean;
}

export const UploadMediaSheet: React.FC<UploadMediaSheetProps> = ({
  open,
  onClose,
  gallerySlug,
  eventId,
  settings,
  requireApproval,
}) => {
  const { toast } = useToast();
  const { upload, progress, retry } = useMediaUpload(gallerySlug, eventId, requireApproval);
  const [selectedType, setSelectedType] = useState<'photo' | 'video' | null>(null);

  const handleFileSelect = async (type: 'photo' | 'video', file: File) => {
    // Check rate limit
    if (!checkRateLimit()) {
      toast({
        title: 'Too Many Uploads',
        description: 'Please wait a minute before uploading again (20 uploads/min limit).',
        variant: 'destructive',
      });
      return;
    }

    // Check duplicate
    if (!checkDuplicate(file)) {
      return;
    }

    // Validate file size
    const maxSize = type === 'photo' 
      ? settings.max_photo_size_mb * 1024 * 1024
      : settings.max_video_size_mb * 1024 * 1024;

    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: `Max size: ${type === 'photo' ? settings.max_photo_size_mb : settings.max_video_size_mb}MB`,
        variant: 'destructive',
      });
      return;
    }

    setSelectedType(type);
    await upload(type, file);
  };

  const checkRateLimit = (): boolean => {
    const RATE_LIMIT_KEY = 'gallery_upload_count';
    const RATE_LIMIT_WINDOW = 60000;
    
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    if (!stored) {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: 1, timestamp: Date.now() }));
      return true;
    }

    const { count, timestamp } = JSON.parse(stored);
    const now = Date.now();

    if (now - timestamp > RATE_LIMIT_WINDOW) {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: 1, timestamp: now }));
      return true;
    }

    if (count >= 20) {
      return false;
    }

    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: count + 1, timestamp }));
    return true;
  };

  const checkDuplicate = (file: File): boolean => {
    const recentUploads = JSON.parse(localStorage.getItem('recent_uploads') || '[]');
    const fileKey = `${file.name}_${file.size}`;
    const twoMinutesAgo = Date.now() - 120000;

    const isDuplicate = recentUploads.some((upload: any) => 
      upload.key === fileKey && upload.timestamp > twoMinutesAgo
    );

    if (isDuplicate) {
      return confirm('This file was recently uploaded. Upload anyway?');
    }

    recentUploads.push({ key: fileKey, timestamp: Date.now() });
    localStorage.setItem('recent_uploads', JSON.stringify(recentUploads.slice(-20)));

    return true;
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[60vh]">
        <SheetHeader>
          <SheetTitle>Upload Media</SheetTitle>
        </SheetHeader>
        
        {!progress ? (
          <div className="grid grid-cols-2 gap-4 mt-6">
            {settings.allow_photos && (
              <label className="relative cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect('photo', e.target.files[0])}
                />
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-8 text-white text-center hover:shadow-xl transform hover:scale-105 transition-all">
                  <Camera className="w-12 h-12 mx-auto mb-4" />
                  <p className="font-semibold text-lg">Photo</p>
                  <p className="text-sm opacity-90 mt-2">Max {settings.max_photo_size_mb}MB</p>
                </div>
              </label>
            )}

            {settings.allow_videos && (
              <label className="relative cursor-pointer">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect('video', e.target.files[0])}
                />
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-8 text-white text-center hover:shadow-xl transform hover:scale-105 transition-all">
                  <Video className="w-12 h-12 mx-auto mb-4" />
                  <p className="font-semibold text-lg">Video</p>
                  <p className="text-sm opacity-90 mt-2">Max {settings.max_video_size_mb}MB</p>
                </div>
              </label>
            )}
          </div>
        ) : (
          <UploadProgress 
            {...progress} 
            onRetry={retry}
            onViewGallery={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
