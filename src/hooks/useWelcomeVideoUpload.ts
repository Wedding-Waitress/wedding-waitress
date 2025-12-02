import { useState } from 'react';
import { Upload } from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useWelcomeVideoUpload = (eventId: string | null) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const maxSize = 500 * 1024 * 1024; // 500MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload MP4, MOV, or WebM video',
        variant: 'destructive',
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 500MB',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const pollVideoStatus = async (streamUid: string): Promise<void> => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-welcome-video-status', {
          body: { stream_uid: streamUid, event_id: eventId },
        });

        if (error) throw error;

        if (data.status === 'ready') {
          setIsProcessing(false);
          toast({
            title: 'Video ready!',
            description: 'Your welcome video is now available',
          });
          return;
        }

        if (data.status === 'error') {
          setIsProcessing(false);
          toast({
            title: 'Video processing failed',
            description: 'There was an error processing your video',
            variant: 'destructive',
          });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setIsProcessing(false);
          toast({
            title: 'Processing timeout',
            description: 'Video is taking longer than expected to process',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        console.error('Polling error:', error);
        setIsProcessing(false);
        toast({
          title: 'Status check failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    };

    poll();
  };

  const uploadVideo = async (file: File) => {
    if (!eventId || !validateFile(file)) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('create-welcome-video-upload', {
        body: { event_id: eventId, file_size: file.size },
      });

      if (error) throw error;

      const upload = new Upload(file, {
        uploadUrl: data.upload_url,
        chunkSize: 50 * 1024 * 1024, // 50MB chunks
        retryDelays: [0, 3000, 5000, 10000, 20000],
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setUploadProgress(percentage);
        },
        onSuccess: async () => {
          setIsUploading(false);
          setIsProcessing(true);
          toast({
            title: 'Upload complete',
            description: 'Processing video...',
          });
          await pollVideoStatus(data.stream_uid);
        },
        onError: (err) => {
          setIsUploading(false);
          console.error('Upload error:', err);
          toast({
            title: 'Upload failed',
            description: err.message,
            variant: 'destructive',
          });
        },
      });

      upload.start();
    } catch (error: any) {
      setIsUploading(false);
      console.error('Setup error:', error);
      toast({
        title: 'Upload setup failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteVideo = async () => {
    if (!eventId) return;

    try {
      await supabase
        .from('live_view_module_settings')
        .update({
          welcome_video_config: null,
        })
        .eq('event_id', eventId);

      await supabase
        .from('welcome_video_uploads')
        .delete()
        .eq('event_id', eventId);

      toast({
        title: 'Video removed',
        description: 'Welcome video has been deleted',
      });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    uploadVideo,
    deleteVideo,
    uploadProgress,
    isUploading,
    isProcessing,
  };
};
