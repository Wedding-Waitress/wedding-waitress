import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UploadProgressProps } from '@/components/Gallery/UploadProgress';

type MediaType = 'photo' | 'video' | 'audio';

export const useMediaUpload = (gallerySlug: string, eventId: string, requireApproval: boolean = false) => {
  const [progress, setProgress] = useState<UploadProgressProps | null>(null);
  const { toast } = useToast();

  const upload = async (type: MediaType, file: File, caption?: string) => {
    try {
      setProgress({ percent: 0, speed: 0, eta: 0, status: 'uploading' });

      // Step 1: Get signed upload URL
      const { data: urlData, error: urlError } = await supabase.functions.invoke('issue-upload-url', {
        body: {
          gallery_slug: gallerySlug,
          type,
          filename: file.name,
          content_type: file.type,
          filesize: file.size,
          caption: caption || null,
        },
      });

      if (urlError) throw urlError;
      if (!urlData?.upload_url) throw new Error('Failed to get upload URL');

      // Step 2: Upload to storage with progress tracking
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            const loadedDiff = e.loaded - lastLoaded;
            const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
            const remaining = e.total - e.loaded;
            const eta = speed > 0 ? Math.ceil(remaining / speed) : 0;

            setProgress({
              percent: Math.round((e.loaded / e.total) * 100),
              speed,
              eta,
              status: 'uploading',
            });

            lastLoaded = e.loaded;
            lastTime = now;
          }
        });

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));

        xhr.open('PUT', urlData.upload_url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.timeout = 300000; // 5 minute timeout
        xhr.send(file);
      });

      // Step 3: Confirm upload
      setProgress({ percent: 100, speed: 0, eta: 0, status: 'processing' });

      const { error: confirmError } = await supabase.functions.invoke('confirm-upload', {
        body: {
          media_item_id: urlData.media_item_id,
          storage_path: urlData.storage_path,
          type,
        },
      });

      if (confirmError) throw confirmError;

      // Step 4: Poll status if video (processing takes time)
      if (type === 'video') {
        await pollVideoStatus(urlData.media_item_id);
      }

      setProgress({ 
        percent: 100, 
        speed: 0, 
        eta: 0, 
        status: 'success',
        requiresApproval: requireApproval 
      });
      
      toast({ 
        title: '🎉 Uploaded!', 
        description: requireApproval 
          ? 'Thanks for sharing! Your photo is being reviewed by the host.' 
          : 'Thanks for sharing your memories!' 
      });

    } catch (err: any) {
      console.error('Upload error:', err);
      
      setProgress({ 
        percent: 0, 
        speed: 0, 
        eta: 0, 
        status: 'error',
        errorMessage: err.message || 'Upload failed. Please try again.',
      });
      
      toast({ 
        title: 'Upload Failed', 
        description: err.message || 'Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  const pollVideoStatus = async (mediaItemId: string) => {
    const maxAttempts = 60; // 6 minutes max (6s intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      const { data } = await supabase
        .from('media_items')
        .select('status')
        .eq('id', mediaItemId)
        .single();

      if (data?.status === 'ready') return;
      if (data?.status === 'failed') throw new Error('Video processing failed');
      
      attempts++;
    }

    throw new Error('Video processing timeout');
  };

  const retry = () => {
    setProgress(null);
  };

  return { upload, progress, retry };
};
