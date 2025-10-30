import React, { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Camera, Video, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { UploadProgress } from './UploadProgress';
import { PhotoSelectionGrid } from './PhotoSelectionGrid';

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (type: 'photo' | 'video', files: FileList) => {
    const fileArray = Array.from(files);
    const maxSize = type === 'photo' 
      ? settings.max_photo_size_mb * 1024 * 1024
      : settings.max_video_size_mb * 1024 * 1024;
    
    const validFiles = fileArray.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: `"${file.name}" is too large`,
          description: `Max size: ${type === 'photo' ? settings.max_photo_size_mb : settings.max_video_size_mb}MB`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setSelectedType(type);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (selectedFiles.length === 1) {
      setSelectedType(null);
    }
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      if (!checkRateLimit()) {
        toast({
          title: 'Rate Limit Reached',
          description: `Uploaded ${successCount}/${selectedFiles.length}. Please wait a minute before continuing.`,
          variant: 'destructive',
        });
        break;
      }

      if (!checkDuplicate(file)) {
        continue;
      }

      try {
        await upload(selectedType!, file);
        successCount++;
      } catch (error) {
        failCount++;
      }
      
      if (i < selectedFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsUploading(false);
    setSelectedFiles([]);
    setSelectedType(null);
    
    if (successCount > 0) {
      toast({
        title: 'Upload Complete',
        description: `✅ ${successCount} uploaded${failCount > 0 ? ` • ❌ ${failCount} failed` : ''}`,
      });
    }
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    setSelectedType(null);
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
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>Upload Media</SheetTitle>
        </SheetHeader>
        
        {!progress ? (
          selectedFiles.length === 0 ? (
            <div className="grid grid-cols-2 gap-4 mt-6">
              {settings.allow_photos && (
                <label className="relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect('photo', e.target.files);
                      }
                      e.target.value = '';
                    }}
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
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect('video', e.target.files);
                      }
                      e.target.value = '';
                    }}
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
            <div className="mt-6 space-y-4">
              <PhotoSelectionGrid 
                files={selectedFiles}
                onRemove={handleRemoveFile}
              />
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="flex-1"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                
                <Button 
                  onClick={handleBatchUpload}
                  className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white"
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} ${selectedFiles.length === 1 ? 'Item' : 'Items'}`}
                </Button>
              </div>
              
              {selectedType && (
                <>
                  <input
                    ref={addMoreInputRef}
                    type="file"
                    multiple
                    accept={selectedType === 'photo'
                      ? "image/jpeg,image/png,image/webp,image/heic"
                      : "video/mp4,video/quicktime,video/x-msvideo"
                    }
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect(selectedType, e.target.files);
                      }
                      e.target.value = '';
                    }}
                  />
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => addMoreInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add More {selectedType === 'photo' ? 'Photos' : 'Videos'}
                  </Button>
                </>
              )}
            </div>
          )
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
