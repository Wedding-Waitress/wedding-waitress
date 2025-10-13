import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Plus, ArrowLeft, X, Camera, Trash2, Play, Video, Loader2, Share2, Mic } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getThemeById } from '@/lib/mediaConstants';
import { useVideoProcessingPoller } from '@/hooks/useVideoProcessingPoller';
import { useChunkedUpload } from '@/hooks/useChunkedUpload';
import { analytics } from '@/lib/analytics';
import { MediaLightbox } from '@/components/MediaLightbox';
import { ShareAlbumModal } from '@/components/ShareAlbumModal';
import { AlbumMetaTags } from '@/components/AlbumMetaTags';
import { useTrackAnalytics } from '@/hooks/useTrackAnalytics';
import weddingWaitressLogo from '@/assets/wedding-waitress-badge-logo.png';

// Lazy load TextPostModal and AudioRecorderModal for better initial page performance
const TextPostModal = React.lazy(() => 
  import('@/components/Dashboard/PhotoVideoSharing/TextPostModal').then(m => ({ default: m.TextPostModal }))
);

const AudioRecorderModal = React.lazy(() =>
  import('@/components/Dashboard/PhotoVideoSharing/AudioRecorderModal').then(m => ({ default: m.AudioRecorderModal }))
);

interface MediaItem {
  id?: string;
  file?: File;
  type: 'photo' | 'video' | 'text';
  preview?: string;
  localPoster?: string; // Local captured poster for preview and immediate gallery poster
  caption?: string;
  textContent?: string;
  themeId?: string;
  themeBg?: string;
  cloudflare_stream_uid?: string | null;
  file_url?: string;
  thumbnail_url?: string | null;
  post_type?: string;
  text_content?: string | null;
  theme_id?: string | null;
  created_at?: string;
  uploadError?: string;
  mime_type?: string;
  stream_ready?: boolean;
  duration_seconds?: number;
}

interface GalleryData {
  id: string;
  title: string;
  event_date: string | null;
  is_active: boolean;
  show_public_gallery: boolean;
  show_footer: boolean;
}

type FlowStep = 'landing' | 'add' | 'preview' | 'uploading' | 'success';
type ViewMode = 'upload' | 'gallery';

export const GuestAlbumPublic: React.FC = () => {
  const { gallerySlug } = useParams<{ gallerySlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [flowStep, setFlowStep] = useState<FlowStep>('landing');
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [galleryData, setGalleryData] = useState<GalleryData | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [showTextPostModal, setShowTextPostModal] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeLayer, setActiveLayer] = useState<'a' | 'b'>('a');
  const [preloadedIndices, setPreloadedIndices] = useState<Set<number>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { trackEvent } = useTrackAnalytics();
  const [hasTrackedView, setHasTrackedView] = useState(false);

  const MAX_VIDEO_SIZE_MB = 2048; // 2 GB max
  const MAX_VIDEO_DURATION_SECONDS = 300; // 5 minutes

  // Chunked upload state
  const { 
    uploadFile: uploadChunked, 
    chunkProgresses, 
    overallProgress: chunkedProgress,
    status: chunkedStatus,
    retryFailedChunks
  } = useChunkedUpload({
    gallerySlug: gallerySlug || '',
    onComplete: (mediaId) => {
      console.log('Chunked upload complete:', mediaId);
    },
    onError: (error) => {
      console.error('Chunked upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error,
        variant: 'destructive',
      });
    },
  });

  // Preload logo for instant badge display
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = weddingWaitressLogo;
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  // Set page title
  useEffect(() => {
    if (galleryData) {
      document.title = `${galleryData.title} | Wedding Waitress`;
    }
  }, [galleryData]);

  // Extract photo URLs for slideshow background
  useEffect(() => {
    const photos = mediaItems.filter(item => 
      item.mime_type?.startsWith('image/') && 
      item.file_url
    );
    
    const sortedPhotos = photos
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
      .slice(0, 20);
    
    const urls = sortedPhotos.map(photo => getMediaUrl(photo.file_url!));
    
    console.log('Slideshow debug:', {
      totalItems: mediaItems.length,
      photosFound: photos.length,
      urls: urls.length,
      firstUrl: urls[0],
      sampleItem: mediaItems[0]
    });
    
    const newestUrlChanged = urls.length > 0 && urls[0] !== photoUrls[0];
    
    setPhotoUrls(urls);
    
    if (newestUrlChanged) {
      setCurrentPhotoIndex(0);
      setActiveLayer('a');
      preloadImage(urls[0], 0);
    }
    
    if (urls.length > 0 && !preloadedIndices.has(0)) {
      preloadImage(urls[0], 0);
    }
  }, [mediaItems]);

  // Preload image helper
  const preloadImage = (url: string, index: number) => {
    if (preloadedIndices.has(index)) return;
    
    const img = new Image();
    img.onload = () => {
      setPreloadedIndices(prev => new Set(prev).add(index));
      
      if (index === 0 && currentPhotoIndex === 0) {
        setActiveLayer('a');
      }
    };
    img.src = url;
  };

  // Slideshow interval (5 seconds)
  useEffect(() => {
    if (photoUrls.length <= 1) return;
    
    const handleVisibilityChange = () => {
      // Interval will be cleaned up and restarted
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const interval = setInterval(() => {
      if (!document.hidden) {
        setCurrentPhotoIndex(prev => {
          const nextIndex = (prev + 1) % photoUrls.length;
          
          // Preload next image
          const nextNextIndex = (nextIndex + 1) % photoUrls.length;
          preloadImage(photoUrls[nextNextIndex], nextNextIndex);
          
          // Toggle layer for cross-fade
          setActiveLayer(current => current === 'a' ? 'b' : 'a');
          
          return nextIndex;
        });
      }
    }, 5000);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [photoUrls, currentPhotoIndex]);

  // 5-second watchdog
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        if (loading) {
          setError('Still working… please check your connection');
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // Use video processing poller to update gallery when videos finish encoding
  useVideoProcessingPoller(galleryData?.id || null, (mediaId) => {
    console.log('Video ready:', mediaId);
    fetchGalleryData(); // Refresh gallery to show processed video
  });

  useEffect(() => {
    if (gallerySlug) {
      fetchGalleryData();
      generateOrGetToken();
      
      // Analytics: gallery view
      analytics.track('gallery_view', { gallery_slug: gallerySlug });
    }
  }, [gallerySlug, retryCount]);

  const generateOrGetToken = () => {
    const storageKey = `guest_token_${gallerySlug}`;
    let existingToken = localStorage.getItem(storageKey);
    
    if (!existingToken) {
      existingToken = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(storageKey, existingToken);
    }
    
    setToken(existingToken);
  };

  const fetchGalleryData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch gallery by slug
      const { data: gallery, error: galleryError } = await supabase
        .from('galleries' as any)
        .select('id, title, event_date, is_active, show_public_gallery, show_footer')
        .eq('slug', gallerySlug)
        .maybeSingle();

      if (galleryError) throw galleryError;

      if (!gallery) {
        setError('not_found');
        setGalleryData(null);
        setLoading(false);
        return;
      }

      // Check visibility
      if (!(gallery as any).is_active || !(gallery as any).show_public_gallery) {
        setError('hidden');
        setGalleryData(null);
        setLoading(false);
        return;
      }

      setGalleryData(gallery as any);

      // Track gallery view (only once per session)
      if (!hasTrackedView) {
        trackEvent({
          galleryId: (gallery as any).id,
          type: 'view',
        });
        setHasTrackedView(true);
      }

      // Fetch all media (show immediately without approval requirement)
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_uploads' as any)
        .select('id, post_type, type, caption, file_url, thumbnail_url, cloudflare_stream_uid, text_content, theme_id, created_at, mime_type')
        .eq('gallery_id', (gallery as any).id)
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;

      setMediaItems((mediaData as any[]) || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching gallery:', error);
      setError('fetch_error');
      setGalleryData(null);
      setLoading(false);
    }
  };

  // Setup real-time subscription for live updates
  useEffect(() => {
    if (!galleryData?.id) return;

    const channel = supabase
      .channel(`media-gallery:${galleryData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_uploads',
          filter: `gallery_id=eq.${galleryData.id}`,
        },
        (payload) => {
          console.log('Real-time media update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newItem = payload.new as any;
            if (newItem.status === 'approved') {
              fetchGalleryData();
            }
          } else if (payload.eventType === 'DELETE') {
            fetchGalleryData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [galleryData?.id]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const convertHeicToJpeg = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx?.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to convert image'));
                return;
              }
              
              const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
              const jpegFile = new File([blob], newFileName, { 
                type: 'image/jpeg',
                lastModified: file.lastModified 
              });
              
              resolve(jpegFile);
            }, 'image/jpeg', 0.9);
          };
          
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = e.target?.result as string;
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const validateVideo = (file: File): Promise<{ valid: boolean; error?: string; duration?: number }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true as any;
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(video.src);
        resolve({ valid: false, error: `Cannot read video "${file.name}". File may be corrupted.` });
      }, 8000);
      
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        const duration = video.duration;
        URL.revokeObjectURL(video.src);
        if (duration > MAX_VIDEO_DURATION_SECONDS) {
          const minutes = Math.floor(duration / 60);
          const seconds = Math.round(duration % 60);
          const maxMinutes = Math.floor(MAX_VIDEO_DURATION_SECONDS / 60);
          resolve({ valid: false, error: `Video is too long (${minutes}:${String(seconds).padStart(2, '0')}). Maximum duration: ${maxMinutes} minutes.` });
        } else {
          resolve({ valid: true, duration });
        }
      };
      
      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(video.src);
        resolve({ valid: false, error: `Cannot read video "${file.name}". File may be corrupted.` });
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const createVideoPoster = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true as any;
      const url = URL.createObjectURL(file);
      video.src = url;

      video.onloadeddata = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No canvas context');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (!blob) return reject('Poster creation failed');
            const posterUrl = URL.createObjectURL(blob);
            URL.revokeObjectURL(url);
            resolve(posterUrl);
          }, 'image/jpeg', 0.8);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
    });
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      console.log('📁 File selection started');
      const files = Array.from(e.target.files || []);
      console.log(`📁 ${files.length} files selected`);
      
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          try {
            console.log(`Processing ${file.name} (${file.type})`);
            
            // Detect video by type OR extension (iOS sometimes gives empty type)
            const isVideo = file.type.startsWith('video/') || 
                           file.name.match(/\.(mov|mp4|m4v|webm)$/i);
            
            // Check video size limit
            let durationSec: number | undefined;
            if (isVideo) {
              const sizeMB = file.size / (1024 * 1024);
              if (sizeMB > MAX_VIDEO_SIZE_MB) {
                toast({ 
                  title: 'Video Too Large', 
                  description: `${file.name} exceeds ${MAX_VIDEO_SIZE_MB} MB limit (${Math.round(sizeMB)} MB).`, 
                  variant: 'destructive' 
                });
                return null;
              }
              const validation = await validateVideo(file);
              if (!validation.valid) {
                toast({ 
                  title: 'Video Validation Failed', 
                  description: validation.error, 
                  variant: 'destructive' 
                });
                return null;
              }
              durationSec = validation.duration;
            }

            let processedFile = file;
            // Convert HEIC/HEIF to JPEG
            if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.match(/\.(heic|heif)$/i)) {
              try {
                processedFile = await convertHeicToJpeg(file);
                toast({ title: 'Converted', description: `${file.name} converted to JPEG` });
              } catch (error) {
                console.error('HEIC conversion error:', error);
                toast({ 
                  title: 'Warning', 
                  description: `Failed to convert ${file.name}`, 
                  variant: 'destructive' 
                });
                return null;
              }
            }

            // Create preview URL and local poster for videos
            let previewUrl = URL.createObjectURL(processedFile);
            let localPoster: string | undefined;
            if (isVideo || processedFile.type.startsWith('video/')) {
              try {
                localPoster = await createVideoPoster(processedFile);
              } catch (err) {
                console.warn('Failed to capture video poster:', err);
                // Continue without poster - use fallback
              }
            }

            const mediaItem = {
              file: processedFile,
              type: (isVideo || processedFile.type.startsWith('video/')) ? 'video' : 'photo',
              preview: previewUrl,
              localPoster,
              caption: '',
              duration_seconds: durationSec,
            } as MediaItem;
            
            console.log(`✅ Processed ${file.name} as ${mediaItem.type}`);
            return mediaItem;
          } catch (fileError) {
            console.error(`Error processing ${file.name}:`, fileError);
            toast({
              title: 'File Processing Error',
              description: `Couldn't process ${file.name}. Please try again.`,
              variant: 'destructive',
            });
            return null;
          }
        })
      );

      const validItems = processedFiles.filter(item => item !== null) as MediaItem[];
      console.log(`✅ ${validItems.length} valid items after processing`);
      
      if (validItems.length === 0) {
        toast({
          title: 'No Files Added',
          description: 'Files were unsupported, too large (>2 GB), or too long (>5 min).',
          variant: 'destructive',
        });
        return;
      }
      
      // Use functional state update to avoid stale state
      setSelectedItems(prev => [...prev, ...validItems]);
      setFlowStep('preview');
      console.log(`✅ Moving to preview with ${validItems.length} items`);
    } catch (error) {
      console.error('File selection error:', error);
      toast({
        title: 'Selection Error',
        description: 'Couldn\'t read selected files. Please try again.',
        variant: 'destructive',
      });
    } finally {
      // Reset input value so same file can be picked again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTextPostSubmit = (data: { textContent: string; themeId: string }) => {
    const theme = getThemeById(data.themeId);
    const newItem: MediaItem = {
      type: 'text',
      textContent: data.textContent,
      themeId: data.themeId,
      themeBg: theme.bgColor,
    };
    
    setSelectedItems([...selectedItems, newItem]);
    setFlowStep('preview');
    setShowTextPostModal(false);
  };

  const handleAudioUpload = async (audioBlob: Blob, duration: number) => {
    if (!galleryData || !token) return;

    setUploadingAudio(true);
    try {
      console.log('🎤 Uploading audio guestbook message...');
      
      // Generate unique filename
      const filename = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webm`;
      const filePath = `${galleryData.id}/${filename}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-uploads')
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Insert record into audio_guestbook table
      const { error: insertError } = await supabase
        .from('audio_guestbook' as any)
        .insert({
          gallery_id: galleryData.id,
          uploader_token: token,
          file_url: filePath,
          duration_seconds: Math.round(duration),
          file_size_bytes: audioBlob.size,
          mime_type: audioBlob.type,
        });

      if (insertError) throw insertError;

      toast({
        title: '✅ Success!',
        description: 'Your audio guestbook message has been uploaded successfully!',
      });

      setShowAudioRecorder(false);
      setFlowStep('success');

      // Refresh gallery
      setTimeout(() => {
        fetchGalleryData();
        setFlowStep('landing');
      }, 2000);

    } catch (error: any) {
      console.error('Audio upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload audio message',
        variant: 'destructive',
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  interface UploadResult {
    item: MediaItem;
    success: boolean;
    error?: string;
  }

  const handleUploadAll = async () => {
    if (!galleryData || selectedItems.length === 0) return;

    setFlowStep('uploading');
    setUploadProgress(0);
    setCurrentUploadIndex(0);

    const results: UploadResult[] = [];

    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        setCurrentUploadIndex(i + 1);

        try {
          if (item.type === 'text') {
            await uploadTextPost(item);
          } else {
            await uploadMediaFile(item);
          }

          results.push({ item, success: true });
        } catch (error: any) {
          console.error(`Upload error for item ${i}:`, error);

          let errorMsg = 'Upload failed';
          
          // Try to extract detailed error from function response
          if (error.context?.body) {
            const body = error.context.body;
            if (body.error) {
              errorMsg = body.error;
              if (body.troubleshooting) {
                errorMsg += ` (${body.troubleshooting})`;
              }
            }
          } else if (error.message === 'FILE_TOO_LARGE') {
            errorMsg = item.type === 'photo' 
              ? 'File too large. Max: 15 MB' 
              : 'File too large. Max: 200 MB';
          } else if (error.message === 'CORS_ERROR') {
            errorMsg = 'Upload blocked by browser (CORS). Please reload and try again.';
          } else if (error.message === 'UNSUPPORTED_TYPE') {
            errorMsg = 'File type not supported';
          } else if (error.message === 'UPLOADS_DISABLED') {
            errorMsg = 'Gallery is not accepting uploads';
          } else if (error.message) {
            errorMsg = error.message;
          }

          results.push({ item, success: false, error: errorMsg });
        }

        setUploadProgress(Math.round(((i + 1) / selectedItems.length) * 100));
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        analytics.track('guest_upload_success', {
          gallery_id: galleryData.id,
          count: successCount,
        });
      }

      if (failCount === 0) {
        setSelectedItems([]);
        setFlowStep('success');
        await fetchGalleryData();

        // Auto-navigate to landing after 3 seconds to show new uploads
        setTimeout(() => {
          setFlowStep('landing');
        }, 3000);
      } else if (successCount > 0) {
        toast({
          title: 'Partial Success',
          description: `${successCount} uploaded, ${failCount} failed. Check items for details.`,
        });

        const failedItems = results
          .filter(r => !r.success)
          .map(r => ({ ...r.item, uploadError: r.error }));

        setSelectedItems(failedItems);
        setFlowStep('preview');
        fetchGalleryData();
      } else {
        toast({
          title: 'Upload Failed',
          description: 'All uploads failed. Please try again.',
          variant: 'destructive',
        });
        setFlowStep('preview');
      }

    } catch (error: any) {
      console.error('Upload batch error:', error);
      toast({
        title: 'Error',
        description: 'Upload process failed',
        variant: 'destructive',
      });
      setFlowStep('preview');
    }
  };

  const uploadTextPost = async (item: MediaItem) => {
    const { error } = await supabase.functions.invoke('confirm-media-upload', {
      body: {
        gallery_id: galleryData!.id,
        upload_token: token,
        post_type: 'text',
        type: 'text',
        text_content: item.textContent,
        theme_id: item.themeId,
        caption: null,
      },
    });

    if (error) throw error;
  };

  const uploadMediaFile = async (item: MediaItem) => {
    if (!item.file || !galleryData) return;

    // Helper to compute overall progress across batch
    const updateOverallProgress = (loaded: number, total: number) => {
      const doneItems = currentUploadIndex - 1; // items already completed
      const fraction = (doneItems + loaded / total) / Math.max(selectedItems.length, 1);
      setUploadProgress(Math.max(1, Math.min(100, Math.round(fraction * 100))));
    };

    // Helper to upload local poster to storage using signed upload URL and return path
    const uploadLocalPosterToStorage = async (): Promise<string | null> => {
      if (!item.localPoster) return null;
      try {
        const blob = await fetch(item.localPoster).then(r => r.blob());
        const filename = `${crypto.randomUUID()}-thumb.jpg`;
        // Request a signed upload URL for the thumbnail
        const { data: thumbUrlData, error: thumbUrlError } = await supabase.functions.invoke('create-media-upload-url', {
          body: {
            gallerySlug: gallerySlug,
            filename,
            contentType: 'image/jpeg',
            file_size: blob.size,
          },
        });
        if (thumbUrlError) {
          console.warn('Poster signed URL error:', thumbUrlError);
          return null;
        }
        // Upload thumbnail using Supabase SDK signed upload
        const { error: uploadErr } = await supabase.storage
          .from('event-media')
          .uploadToSignedUrl(
            thumbUrlData.file_path,
            thumbUrlData.token,
            blob,
            { contentType: 'image/jpeg' }
          );
        if (uploadErr) {
          console.warn('Poster signed upload error:', uploadErr);
          return null;
        }
        return thumbUrlData.file_path as string;
      } catch (err) {
        console.warn('Poster upload failed:', err);
        return null;
      }
    };

    // XHR upload with progress (supports CORS/PUT/POST)
    const xhrUpload = (url: string, method: 'PUT' | 'POST', body: Blob | FormData, headers?: Record<string, string>) => {
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        if (headers) {
          Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        }
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) updateOverallProgress(e.loaded, e.total);
        };
        xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
        xhr.onabort = () => reject(new Error('ABORTED'));
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.send(body);
      });
    };

    try {
      // Get upload URL details (now includes duration_seconds)
      const { data: urlData, error: urlError } = await supabase.functions.invoke('create-media-upload-url', {
        body: {
          gallerySlug: gallerySlug,
          filename: item.file.name,
          contentType: item.file.type,
          file_size: item.file.size,
          duration_seconds: item.duration_seconds,
        },
      });

      if (urlError) {
        console.error('Upload URL error:', urlError);
        if (urlError.status === 400) throw new Error(urlError.message || 'Validation error');
        if (urlError.status === 413) throw new Error('FILE_TOO_LARGE');
        if (urlError.status === 403) throw new Error('UPLOADS_DISABLED');
        if (urlError.status >= 500) throw new Error('Server error. Please try again.');
        throw urlError;
      }

      // Cloudflare direct upload path
      if (urlData.stream_upload_url && item.type === 'video') {
        // Upload local poster immediately (so gallery can show a thumbnail)
        const thumbPath = await uploadLocalPosterToStorage();

        // Use FormData for Cloudflare direct upload
        const form = new FormData();
        form.append('file', item.file);
        await xhrUpload(urlData.stream_upload_url, 'POST', form);

        // Confirm record with Cloudflare UID
        const { error: confirmErr } = await supabase.functions.invoke('confirm-media-upload', {
          body: {
            gallery_id: urlData.gallery_id,
            upload_token: 'stream-direct',
            file_path: '',
            type: 'video',
            post_type: 'video',
            caption: item.caption || null,
            file_size: item.file.size,
            mime_type: item.file.type,
            duration_seconds: item.duration_seconds,
            cloudflare_stream_uid: urlData.stream_uid,
            thumbnail_url: thumbPath,
          },
        });
        if (confirmErr) throw confirmErr;
        return;
      }

      // Chunked upload path for large videos
      if (urlData.use_multipart && item.type === 'video') {
        const mediaId = await uploadChunked(item.file, item.caption || undefined);
        if (!mediaId) throw new Error('Chunked upload failed');
        return;
      }

      // Supabase Storage signed URL upload (SDK)
      const { error: supaUploadErr } = await supabase.storage
        .from('event-media')
        .uploadToSignedUrl(
          urlData.file_path,
          urlData.token,
          item.file,
          { contentType: urlData.content_type || item.file.type }
        );
      if (supaUploadErr) throw supaUploadErr;

      // If video, upload poster and include in confirmation
      let thumbPath: string | null = null;
      if (item.type === 'video') thumbPath = await uploadLocalPosterToStorage();

      const { error: confirmError } = await supabase.functions.invoke('confirm-media-upload', {
        body: {
          gallery_id: urlData.gallery_id,
          upload_token: urlData.token,
          file_path: urlData.file_path,
          type: item.type,
          post_type: item.type,
          caption: item.caption || null,
          width: undefined,
          height: undefined,
          file_size: item.file.size,
          mime_type: urlData.content_type || item.file.type,
          thumbnail_url: thumbPath,
        },
      });
      if (confirmError) throw confirmError;

    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.message === 'NETWORK_TIMEOUT') throw new Error('Upload timed out after 5 minutes.');
      if (error.message?.includes('413')) throw new Error('FILE_TOO_LARGE');
      if (error.message?.includes('CORS')) throw new Error('CORS_ERROR');
      throw error;
    }
  };

  const openMediaLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleShareGallery = async () => {
    const galleryUrl = `${window.location.origin}/a/${gallerySlug}?utm_source=share_button`;
    const shareData = {
      title: `🎉 ${galleryData?.title || 'Album'} — Wedding Waitress Album`,
      text: 'View the full album of photos & videos',
      url: galleryUrl,
    };

    // Track share event
    if (galleryData?.id) {
      trackEvent({
        galleryId: galleryData.id,
        type: 'share',
        source: 'share_button',
      });
    }

    try {
      // Try Web Share API first (mobile)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: 'Shared successfully',
          description: 'Gallery shared!',
        });
      } else {
        // Fallback: Show modal with copy link
        setShareModalOpen(true);
      }
    } catch (error: any) {
      // User cancelled share
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        // Show modal as fallback
        setShareModalOpen(true);
      }
    }
  };

  const getMediaUrl = (filePath: string) => {
    if (!filePath) return '';
    
    // Remove 'event-media/' prefix if present
    const cleanPath = filePath.startsWith('event-media/') 
      ? filePath.replace('event-media/', '') 
      : filePath;
    
    // Get public URL with responsive transforms for high quality
    const { data } = supabase.storage
      .from('event-media')
      .getPublicUrl(cleanPath, {
        transform: {
          width: 1920,
          quality: 85,
          resize: 'contain'
        }
      });
    
    return data?.publicUrl || '';
  };

  // Loading skeleton
  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-center mb-8">
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Get first photo URL for Open Graph
  const firstPhotoUrl = mediaItems.find(item => item.type === 'photo' && item.file_url)?.file_url;

  // Error states
  if (error || !galleryData) {
    return (
      <>
        {galleryData && (
          <AlbumMetaTags
            galleryTitle={galleryData.title}
            eventDate={galleryData.event_date}
            gallerySlug={gallerySlug || ''}
            firstPhotoUrl={firstPhotoUrl ? getMediaUrl(firstPhotoUrl) : undefined}
          />
        )}
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="ww-box max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-6xl">
              {error === 'hidden' ? '🔒' : error === 'not_found' ? '🔍' : '⚠️'}
            </div>
            <h3 className="text-xl font-semibold">
              {error === 'hidden' 
                ? 'Gallery Not Visible' 
                : error === 'not_found'
                ? 'Gallery Not Found'
                : 'Connection Issue'}
            </h3>
            <p className="text-muted-foreground">
              {error === 'hidden'
                ? "This gallery isn't visible right now. Please check back later."
                : error === 'not_found'
                ? "This gallery isn't available right now. It may be hidden or the link is incorrect."
                : error === 'fetch_error'
                ? "Couldn't load the gallery. Please check your connection."
                : "Still working… please check your connection"}
            </p>
            <Button onClick={handleRetry} variant="default">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
      </>
    );
  }

  // Landing page
  if (flowStep === 'landing') {
    return (
      <>
        <AlbumMetaTags
          galleryTitle={galleryData.title}
          eventDate={galleryData.event_date}
          gallerySlug={gallerySlug || ''}
          firstPhotoUrl={firstPhotoUrl ? getMediaUrl(firstPhotoUrl) : undefined}
        />
        <div className="h-screen relative overflow-hidden">
        {/* Base gradient fallback */}
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-purple-100 via-purple-50 to-blue-50" />
        
        {/* Slideshow background layers */}
        {photoUrls.length > 0 && (
          <>
            <div 
              id="hero-bg-a" 
              className="hero-bg" 
              style={{ 
                backgroundImage: activeLayer === 'a' ? `url(${photoUrls[currentPhotoIndex]})` : 'none',
                opacity: activeLayer === 'a' ? 1 : 0 
              }} 
            />
            <div 
              id="hero-bg-b" 
              className="hero-bg" 
              style={{ 
                backgroundImage: activeLayer === 'b' ? `url(${photoUrls[currentPhotoIndex]})` : 'none',
                opacity: activeLayer === 'b' ? 1 : 0 
              }} 
            />
            <div className="hero-overlay" />
          </>
        )}
        
        {/* Sticky header badge */}
        <div className="sticky top-0 z-20 flex justify-center pt-4 pb-2">
          <a
            href="https://www.weddingwaitress.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-full px-5 py-3 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-3"
          >
            <span className="text-sm font-medium">💜 Made with</span>
            <img src={weddingWaitressLogo} alt="Wedding Waitress" className="h-10" />
          </a>
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-screen overflow-y-hidden px-4">
          <div className="text-center space-y-8 max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-bold text-black drop-shadow-lg">{galleryData.title}</h1>
            {galleryData.event_date && (
              <p className="text-xl text-black drop-shadow-md">
                {format(new Date(galleryData.event_date), 'do MMMM yyyy')}
              </p>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-xl px-12 py-8 rounded-2xl"
                onClick={() => setFlowStep('add')}
              >
                <Plus className="w-6 h-6 mr-3" />
                Add to Album
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="text-xl px-12 py-8 rounded-2xl bg-white/90 hover:bg-white"
                onClick={() => setViewMode('gallery')}
              >
                View Album
              </Button>
            </div>

            {/* Share Album Button */}
            <div className="flex justify-center mt-4">
              <Button
                variant="ghost"
                className="text-black hover:bg-white/20 rounded-full gap-2"
                onClick={handleShareGallery}
              >
                <Share2 className="w-5 h-5" />
                Share Album
              </Button>
            </div>

            {/* Recent Media Count */}
            {mediaItems.length > 0 && (
              <div className="mt-12 w-full max-w-4xl mx-auto">
                <p className="text-sm text-white drop-shadow-md mb-4 text-center">
                  {mediaItems.length} photos, videos & posts ⬇️
                </p>
                <div className="overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth -mx-4 px-4">
                  <div className="flex gap-3 min-w-min">
                    {mediaItems.slice(0, 30).map((item) => (
                      <div
                        key={item.id}
                        className="snap-start shrink-0 cursor-pointer transition-transform hover:scale-105"
                       onClick={() => setViewMode('gallery')}
                      >
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg shadow-md overflow-hidden bg-muted">
                          {item.post_type === 'photo' && item.file_url ? (
                            <img
                              src={getMediaUrl(item.file_url)}
                              alt={item.caption || 'Gallery photo'}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : item.post_type === 'video' && item.thumbnail_url ? (
                            <div className="relative w-full h-full">
                              {item.cloudflare_stream_uid ? (
                                <img
                                  src={item.thumbnail_url || `https://customer-${item.cloudflare_stream_uid.split('/')[0]}.cloudflarestream.com/${item.cloudflare_stream_uid}/thumbnails/thumbnail.jpg`}
                                  alt={item.caption || 'Video thumbnail'}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <img
                                  src={item.thumbnail_url}
                                  alt={item.caption || 'Video thumbnail'}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                  <div className="w-0 h-0 border-l-[8px] border-l-primary border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
                                </div>
                              </div>
                            </div>
                          ) : item.post_type === 'text' ? (
                            <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-primary/5">
                              <p className="text-sm text-center line-clamp-4">
                                {item.text_content}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
    );
  }

  // Add media page
  if (flowStep === 'add') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">{galleryData.title}</h1>
            <Button variant="ghost" onClick={() => setFlowStep('landing')}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <Card 
            className="border-2 border-dashed border-primary/50 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="p-12 text-center space-y-4">
              <Camera className="w-16 h-16 mx-auto text-primary" />
              <h3 className="text-2xl font-semibold">📸 Pick Photos & Videos</h3>
              <p className="text-muted-foreground">
                Tap here to select from your gallery, take a photo, or choose files
              </p>
            </CardContent>
          </Card>

          <div className="text-center space-y-3">
            <Button
              variant="link"
              className="text-primary text-lg"
              onClick={() => setShowTextPostModal(true)}
            >
              Or add a text message
            </Button>

            <Button
              variant="link"
              className="text-primary text-lg flex items-center gap-2 mx-auto"
              onClick={() => setShowAudioRecorder(true)}
            >
              <Mic className="w-5 h-5" />
              Or record Audio Guestbook
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,video/mp4,video/quicktime,video/x-m4v,video/webm"
            multiple
            onChange={handleFileSelection}
            className="hidden"
          />
        </div>

        <React.Suspense fallback={null}>
          <TextPostModal
            open={showTextPostModal}
            onClose={() => setShowTextPostModal(false)}
            onSubmit={handleTextPostSubmit}
          />
        </React.Suspense>

        <React.Suspense fallback={null}>
          <AudioRecorderModal
            open={showAudioRecorder}
            onClose={() => setShowAudioRecorder(false)}
            onUploadComplete={handleAudioUpload}
            uploading={uploadingAudio}
          />
        </React.Suspense>
      </div>
    );
  }

  // Preview uploads page
  if (flowStep === 'preview') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Preview Your Uploads</h2>
            <Button variant="ghost" onClick={() => setFlowStep('add')}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {selectedItems.map((item, index) => (
              <div key={index} className="relative group">
                <div className={`relative border-2 border-primary rounded-none overflow-hidden ${
                  item.type === 'text' 
                    ? 'aspect-square flex items-center justify-center p-3' 
                    : 'aspect-square bg-black'
                }`} style={item.type === 'text' ? { background: item.themeBg } : undefined}>
                  {item.type === 'photo' && item.preview && (
                    <img src={item.preview} className="w-full h-full object-contain" alt="" />
                  )}
                  {item.type === 'video' && item.preview && (
                    <img src={item.localPoster || item.preview} className="w-full h-full object-cover" alt="Video preview" />
                  )}
                  {item.type === 'text' && (
                    <p className="text-center font-medium text-sm line-clamp-6">
                      {item.textContent}
                    </p>
                  )}
                  
                  {item.uploadError && (
                    <div className="absolute bottom-2 left-2 right-2 bg-destructive text-destructive-foreground text-xs p-2 rounded z-10">
                      {item.uploadError}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg text-lg py-6"
              onClick={handleUploadAll}
            >
              Upload {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Uploading page
  if (flowStep === 'uploading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="ww-box max-w-md w-full">
          <CardContent className="p-12 text-center space-y-8">
            <div className="relative w-48 h-48 mx-auto">
              <svg className="w-full h-full" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" stroke="hsl(var(--muted))" strokeWidth="12" fill="none" />
                <circle
                  cx="100" cy="100" r="90"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 90}`}
                  strokeDashoffset={`${2 * Math.PI * 90 * (1 - uploadProgress / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)"
                  className="transition-all duration-300"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
                <text x="100" y="110" textAnchor="middle" className="text-4xl font-bold fill-foreground">
                  {uploadProgress}%
                </text>
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Uploading...</h3>
              <p className="text-muted-foreground">Keep this page open until uploads are complete</p>
              
              {chunkedStatus === 'uploading' && chunkProgresses.length > 0 && (
                <p className="text-sm text-primary mt-2">
                  Processing video in chunks... ({Math.round(chunkedProgress)}%)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Uploading {currentUploadIndex} of {selectedItems.length}
              </p>
              <Progress value={chunkedStatus === 'uploading' ? chunkedProgress : uploadProgress} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success page
  if (flowStep === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="ww-box max-w-2xl w-full">
          <CardContent className="p-12 text-center space-y-8">
            <div className="text-6xl">✅</div>
            <h1 className="text-4xl font-bold">Your uploads are all in!</h1>
            <p className="text-xl text-muted-foreground">
              Your uploads will show up in the album shortly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                onClick={() => {
                  setViewMode('gallery');
                  setFlowStep('landing');
                }}
              >
                View Album
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setSelectedItems([]);
                  setFlowStep('landing');
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Add More
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main render - landing page with optional gallery overlay
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Base gradient fallback */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-purple-100 via-purple-50 to-blue-50" />
      
      {/* Slideshow background layers */}
      {photoUrls.length > 0 && (
        <>
          <div 
            id="hero-bg-a" 
            className="hero-bg" 
            style={{ 
              backgroundImage: activeLayer === 'a' ? `url(${photoUrls[currentPhotoIndex]})` : 'none',
              opacity: activeLayer === 'a' ? 1 : 0 
            }} 
          />
          <div 
            id="hero-bg-b" 
            className="hero-bg" 
            style={{ 
              backgroundImage: activeLayer === 'b' ? `url(${photoUrls[currentPhotoIndex]})` : 'none',
              opacity: activeLayer === 'b' ? 1 : 0 
            }} 
          />
          <div className="hero-overlay" />
        </>
      )}

      {/* Content layer - Landing Page */}
      <div className="relative z-10 min-h-screen">
        {/* Sticky header badge */}
        <div className="sticky top-0 z-20 flex justify-center pt-4 pb-2 bg-gradient-to-b from-black/20 to-transparent backdrop-blur-sm">
          <a
            href="https://www.weddingwaitress.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-full px-5 py-3 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-3"
          >
            <span className="text-sm font-medium">💜 Made with</span>
            <img src={weddingWaitressLogo} alt="Wedding Waitress" className="h-10" />
          </a>
        </div>

        {/* Header */}
        <div className="text-white py-12 px-4 text-center">
          <div className="max-w-6xl mx-auto space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg">{galleryData.title}</h1>
            {galleryData.event_date && (
              <p className="text-xl drop-shadow-md">
                {format(new Date(galleryData.event_date), 'MMMM d, yyyy')}
              </p>
            )}
            <p className="text-sm drop-shadow-md">
              {mediaItems.length} photos, videos & posts ⬇️
            </p>
          </div>
        </div>

        {/* Sticky Add Button */}
        <div className="sticky top-20 z-10 px-4 pb-4 flex justify-center">
          <Button
            size="lg"
            className="bg-white text-primary hover:bg-white/90 shadow-lg font-semibold"
            onClick={() => setFlowStep('add')}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add to Album
          </Button>
        </div>

        {/* Gallery Grid */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* View Mode Toggle */}
          {mediaItems.length > 12 && (
            <div className="flex justify-center mb-6">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/20 hover:text-white shadow-lg backdrop-blur-sm"
                onClick={() => setViewMode(viewMode === 'upload' ? 'gallery' : 'upload')}
              >
                {viewMode === 'upload' ? 'View All' : 'Show Less'}
              </Button>
            </div>
          )}
          
          {mediaItems.length === 0 ? (
            <Card className="ww-box max-w-md mx-auto bg-white">
              <CardContent className="p-12 text-center space-y-4">
                <div className="text-6xl mb-4">📸</div>
                <h3 className="text-xl font-semibold">No photos yet</h3>
                <p className="text-muted-foreground">
                  Be the first to share a memory!
                </p>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                  onClick={() => setFlowStep('add')}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Photos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {(viewMode === 'gallery' ? mediaItems : mediaItems.slice(0, 12)).map((item, index) => (
                <div
                  key={item.id}
                  className="aspect-square bg-white rounded-lg border-4 border-white shadow-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => openMediaLightbox(index)}
                >
                  {item.post_type === 'photo' && item.file_url ? (
                    <img
                      src={getMediaUrl(item.file_url)}
                      alt={item.caption || 'Gallery photo'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : item.post_type === 'video' ? (
                    <div className="relative w-full h-full group">
                      {item.cloudflare_stream_uid ? (
                        <div className="relative w-full h-full">
                          <img
                            src={item.thumbnail_url || `https://customer-${item.cloudflare_stream_uid.split('/')[0]}.cloudflarestream.com/${item.cloudflare_stream_uid}/thumbnails/thumbnail.jpg`}
                            alt={item.caption || 'Video thumbnail'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                      ) : item.thumbnail_url ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={getMediaUrl(item.thumbnail_url)} 
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full">
                          <video
                            src={getMediaUrl(item.file_url)}
                            className="w-full h-full object-cover"
                            playsInline
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : item.post_type === 'text' && item.text_content ? (
                    <div 
                      className="w-full h-full flex items-center justify-center p-4"
                      style={{ background: item.theme_id ? getThemeById(item.theme_id).bgColor : '#f0f0f0' }}
                    >
                      <p className="text-center font-medium text-sm line-clamp-6" style={{ color: item.theme_id ? getThemeById(item.theme_id).textColor : '#000' }}>
                        {item.text_content}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {galleryData.show_footer && (
          <div className="py-8 text-center">
            <div className="text-sm text-white drop-shadow-md flex items-center justify-center gap-3">
              <span>Made with 💜</span>
              <a
                href="https://www.weddingwaitress.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <img src={weddingWaitressLogo} alt="Wedding Waitress" className="h-8 inline-block" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Media Lightbox */}
      <MediaLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={mediaItems.map(item => ({
          id: item.id || '',
          type: item.type,
          file_url: item.file_url ? getMediaUrl(item.file_url) : item.preview,
          thumbnail_url: item.thumbnail_url ? getMediaUrl(item.thumbnail_url) : null,
          cloudflare_stream_uid: item.cloudflare_stream_uid,
          caption: item.caption || item.text_content || undefined,
          created_at: item.created_at,
          mime_type: item.mime_type,
        }))}
        initialIndex={lightboxIndex}
        onShareGallery={handleShareGallery}
        galleryId={galleryData?.id || ''}
        onTrackDownload={(type) => {
          if (galleryData?.id) {
            trackEvent({
              galleryId: galleryData.id,
              type: type === 'bulk' ? 'bulk_download' : 'download',
            });
          }
        }}
      />

      {/* Share Album Modal */}
      <ShareAlbumModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        galleryUrl={`${window.location.origin}/a/${gallerySlug}`}
        galleryTitle={galleryData?.title || 'Album'}
      />
    </div>
  );
};