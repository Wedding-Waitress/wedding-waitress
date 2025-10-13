import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, Camera, ArrowLeft, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getThemeById } from '@/lib/mediaConstants';
import weddingWaitressLogo from '@/assets/wedding-waitress-badge-logo.png';
import { usePhotoSlideshow } from '@/hooks/usePhotoSlideshow';
import { PhotoSlideshowBackground } from '@/components/PhotoSlideshowBackground';
import { useChunkedUpload } from '@/hooks/useChunkedUpload';

// Lazy load TextPostModal for better performance
const TextPostModal = React.lazy(() => 
  import('@/components/Dashboard/PhotoVideoSharing/TextPostModal').then(m => ({ default: m.TextPostModal }))
);

interface MediaItem {
  file?: File;
  type: 'photo' | 'video' | 'text';
  preview?: string;
  caption?: string;
  textContent?: string;
  themeId?: string;
  themeBg?: string;
  uploadSuccess?: boolean;
  uploadError?: string;
}

interface EventData {
  id: string;
  name: string;
  event_display_name: string | null;
  date: string;
  event_date_override: string | null;
  slug: string;
}

type FlowStep = 'landing' | 'add' | 'preview' | 'uploading' | 'success';

export const GuestMediaUpload: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [flowStep, setFlowStep] = useState<FlowStep>('landing');
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [token, setToken] = useState('');
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [showTextPostModal, setShowTextPostModal] = useState(false);
  
  // Chunked upload state
  const [isChunkedUpload, setIsChunkedUpload] = useState(false);
  const { 
    uploadFile: uploadChunked, 
    chunkProgresses, 
    overallProgress: chunkedProgress,
    status: chunkedStatus,
    retryFailedChunks
  } = useChunkedUpload({
    gallerySlug: eventSlug || '',
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFooter, setShowFooter] = useState(true);
  const [showPublicGallery, setShowPublicGallery] = useState(true);
  
  // Constants for validation
  const MAX_VIDEO_SIZE_MB = 1024; // 1 GB max
  const MAX_VIDEO_DURATION_SECONDS = 180; // 3 minutes
  const SUPPORTED_VIDEO_TYPES = [
    'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v',
    'video/hevc', 'video/h265', 'video/h264', 'video/mpeg'
  ];
  
  // Photo slideshow for background
  const { photos, currentIndex, hasPhotos } = usePhotoSlideshow(galleryId);

  // Enforce canonical domain redirect
  useEffect(() => {
    const photoShareUrl = import.meta.env.VITE_PHOTO_SHARE_BASE_URL;
    
    if (photoShareUrl) {
      const currentHost = window.location.host;
      const canonicalHost = new URL(photoShareUrl).host;
      
      // Redirect if not on canonical domain (exclude localhost for development)
      if (currentHost !== canonicalHost && !currentHost.includes('localhost')) {
        const newUrl = `${photoShareUrl}${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(newUrl); // 301-like permanent redirect
      }
    }
  }, []);

  // Track page load performance
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perfData) {
          console.log('Page Load Time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
          console.log('DOM Content Loaded:', perfData.domContentLoadedEventEnd - perfData.fetchStart, 'ms');
        }
      });
    }
  }, []);

  useEffect(() => {
    if (eventSlug) {
      fetchEventData();
      generateOrGetToken();
    }
  }, [eventSlug]);

  // Set page title
  useEffect(() => {
    if (eventData?.name) {
      document.title = `${eventData.name} | Wedding Waitress`;
    }
  }, [eventData?.name]);

  const fetchEventData = async () => {
    try {
      const { data: gallery } = await supabase
        .from('galleries' as any)
        .select('id, title, show_footer, show_public_gallery, is_active')
        .eq('slug', eventSlug)
        .maybeSingle();

      if (!gallery) {
        throw new Error('Gallery not found');
      }

      // Check if gallery is visible
      if (!(gallery as any).is_active || !(gallery as any).show_public_gallery) {
        setEventData(null);
        setLoading(false);
        return;
      }

      setGalleryId((gallery as any).id);
      setGalleryTitle((gallery as any).title);
      setShowFooter((gallery as any).show_footer ?? true);
      setShowPublicGallery((gallery as any).show_public_gallery ?? true);
      
      // Fetch event data - just for display
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('slug', eventSlug)
        .single();

      if (error) throw error;
      setEventData(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event',
        variant: 'destructive',
      });
      setEventData(null);
    } finally {
      setLoading(false);
    }
  };

  const generateOrGetToken = () => {
    const storageKey = `guest_token_${eventSlug}`;
    let existingToken = localStorage.getItem(storageKey);
    
    if (!existingToken) {
      existingToken = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(storageKey, existingToken);
    }
    
    setToken(existingToken);
  };

  const validateVideo = (file: File): Promise<{ valid: boolean; error?: string; duration?: number }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(video.src);
        resolve({ valid: false, error: `Cannot read video "${file.name}". File may be corrupted.` });
      }, 8000);
      
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        const duration = video.duration;
        URL.revokeObjectURL(video.src);
        
        if (duration > MAX_VIDEO_DURATION_SECONDS) {
          resolve({ 
            valid: false, 
            error: `Video "${file.name}" is too long (${Math.round(duration)}s). Max: ${Math.round(MAX_VIDEO_DURATION_SECONDS / 60)} minutes.` 
          });
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

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: MediaItem[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      
      // Validate video format
      if (isVideo && !SUPPORTED_VIDEO_TYPES.includes(file.type)) {
        toast({
          title: 'Unsupported Video Format',
          description: `${file.name} isn't supported. Please use MP4, MOV, or WebM.`,
          variant: 'destructive',
        });
        continue;
      }
      
      // Validate video size
      if (isVideo) {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > MAX_VIDEO_SIZE_MB) {
          toast({
            title: 'Video Too Large',
            description: `${file.name} exceeds ${MAX_VIDEO_SIZE_MB} MB limit (${Math.round(sizeMB)} MB). Please trim it.`,
            variant: 'destructive',
          });
          continue;
        }
        
        // Validate video duration
        const validation = await validateVideo(file);
        if (!validation.valid) {
          toast({
            title: 'Video Validation Failed',
            description: validation.error,
            variant: 'destructive',
          });
          continue;
        }
      }
      
      const preview = URL.createObjectURL(file);

      // For videos, generate a thumbnail from the first frame
      let thumbnail = preview;
      if (isVideo) {
        try {
          thumbnail = await generateVideoThumbnail(file);
        } catch (error) {
          console.error('Failed to generate video thumbnail:', error);
          // Use play icon fallback
          thumbnail = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSIjMDAwIi8+Cjxwb2x5Z29uIHBvaW50cz0iMjAwLDE1MCAzNTAsMjU2IDIwMCwzNjIiIGZpbGw9IiNmZmYiLz4KPC9zdmc+';
        }
      }

      newItems.push({
        file,
        type: isVideo ? 'video' : 'photo',
        preview: thumbnail,
        caption: '',
      });
    }
    
    setSelectedItems([...selectedItems, ...newItems]);
    if (newItems.length > 0) {
      setFlowStep('preview');
    }
  };

  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      
      // Timeout fallback
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Thumbnail generation timeout'));
      }, 10000);

      video.onloadeddata = () => {
        // Seek to 0.1 seconds (better for short videos)
        video.currentTime = Math.min(0.1, video.duration / 4);
      };

      video.onseeked = () => {
        clearTimeout(timeout);
        
        // Set canvas size to reasonable thumbnail
        const targetWidth = 512;
        const aspectRatio = video.videoHeight / video.videoWidth;
        canvas.width = targetWidth;
        canvas.height = targetWidth * aspectRatio;
        
        // Draw with black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        }, 'image/jpeg', 0.85);
      };

      video.onerror = (e) => {
        clearTimeout(timeout);
        URL.revokeObjectURL(video.src);
        reject(new Error(`Video load error: ${video.error?.message || 'Unknown'}`));
      };

      video.src = URL.createObjectURL(file);
      video.load();
    });
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
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (!eventData || selectedItems.length === 0) return;

    setFlowStep('uploading');
    setUploadProgress(0);
    setCurrentUploadIndex(0);

    const uploadedItems = [...selectedItems];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < uploadedItems.length; i++) {
      const item = uploadedItems[i];
      setCurrentUploadIndex(i + 1);

      try {
        if (item.type === 'text') {
          await uploadTextPost(item);
        } else {
          await uploadMediaFile(item);
        }
        uploadedItems[i].uploadSuccess = true;
        successCount++;
      } catch (error: any) {
        console.error(`Upload error for item ${i}:`, error);
        uploadedItems[i].uploadSuccess = false;
        uploadedItems[i].uploadError = error.message || 'Upload failed';
        failureCount++;
      }

      setUploadProgress(Math.round(((i + 1) / uploadedItems.length) * 100));
    }

    setSelectedItems(uploadedItems);

    if (failureCount > 0) {
      toast({
        title: 'Upload Issues',
        description: `${failureCount} ${failureCount === 1 ? 'file' : 'files'} failed to upload — please try again.`,
        variant: 'destructive',
      });
      setFlowStep('preview');
    } else {
      setFlowStep('success');
    }
  };

  const uploadTextPost = async (item: MediaItem) => {
    const { error } = await supabase.functions.invoke('confirm-media-upload', {
      body: {
        gallery_id: galleryId,
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
    if (!item.file) return;

    try {
      // Log request for debugging
      console.log('Requesting upload URL:', {
        filename: item.file.name,
        contentType: item.file.type,
        file_size: item.file.size,
        gallerySlug: eventSlug,
      });

      // Check if we should use chunked upload
      const { data: urlData, error: urlError } = await supabase.functions.invoke(
        'create-media-upload-url',
        {
          body: {
            gallerySlug: eventSlug,
            filename: item.file.name,
            contentType: item.file.type,
            file_size: item.file.size,
          },
        }
      );

      if (urlError) {
        // Enhanced error logging
        console.error('Upload URL error:', {
          error: urlError,
          status: urlError.status,
          message: urlError.message,
          context: urlError.context,
          request: {
            gallerySlug: eventSlug,
            filename: item.file.name,
            contentType: item.file.type,
            file_size: item.file.size,
          }
        });

        // Parse specific error types
        if (urlError.status === 400) {
          const errorMsg = urlError.message || '';
          
          if (errorMsg.includes('Missing required fields')) {
            throw new Error(`Invalid request to server: ${errorMsg}. Please try again.`);
          } else if (errorMsg.includes('type') || errorMsg.includes('format')) {
            throw new Error(`File type "${item.file.type}" isn't supported. Please use MP4, MOV, JPG, or PNG.`);
          } else {
            throw new Error(`Request validation failed: ${errorMsg}`);
          }
        } else if (urlError.status === 413) {
          throw new Error(`File "${item.file.name}" is too large. Max: 1 GB for videos, 250 MB for photos.`);
        } else if (urlError.status === 429) {
          throw new Error('Too many upload attempts. Please wait a minute and try again.');
        } else if (urlError.status >= 500) {
          throw new Error('Server error. Please try again in a few minutes.');
        }

        throw urlError;
      }

      // If response indicates multipart upload
      if (urlData.use_multipart) {
        setIsChunkedUpload(true);
        const mediaId = await uploadChunked(item.file, item.caption || undefined);
        if (!mediaId) {
          throw new Error('Chunked upload failed');
        }
        return;
      }

      // Standard single-file upload for smaller files
      setIsChunkedUpload(false);
      const uploadUrl = urlData.signed_url;
      if (!uploadUrl) {
        throw new Error('No upload URL received');
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: item.file,
        headers: {
          'Content-Type': item.file.type,
        },
      });

      if (!uploadResponse.ok) {
        console.error('Upload failed:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
        });
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      // Prepare confirmation data
      const confirmBody: any = {
        gallery_id: galleryId,
        upload_token: token,
        type: item.type === 'video' ? 'video' : 'image',
        post_type: item.type,
        caption: item.caption || null,
        file_size: item.file.size,
        mime_type: item.file.type,
        file_path: urlData.file_path,
      };

      // Get dimensions for images
      if (item.type === 'photo' && item.preview) {
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = () => {
            confirmBody.width = img.width;
            confirmBody.height = img.height;
            resolve(null);
          };
          img.src = item.preview;
        });
      }

      const { error: confirmError } = await supabase.functions.invoke('confirm-media-upload', {
        body: confirmBody,
      });

      if (confirmError) throw confirmError;
    } catch (error: any) {
      // Log full error details
      console.error('Upload failed:', {
        error,
        file: {
          name: item.file?.name,
          type: item.file?.type,
          size: item.file?.size,
        },
        stack: error.stack,
      });
      
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
        <Card className="ww-box max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-6xl">🔒</div>
            <h3 className="text-xl font-semibold">Gallery Not Available</h3>
            <p className="text-muted-foreground">
              This gallery isn't visible right now. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayDate = eventData.event_date_override || eventData.date;
  const displayName = eventData.event_display_name || eventData.name;

  const getMediaUrl = (path: string) => {
    if (!path) return '';
    const { data } = supabase.storage.from('event-media').getPublicUrl(path);
    return data.publicUrl;
  };

  if (flowStep === 'landing') {
    return (
      <div className="min-h-screen relative">
        {/* Photo slideshow background with fallback gradient */}
        <PhotoSlideshowBackground photos={photos} currentIndex={currentIndex} />

        {/* Content layer */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header Badge */}
          <div className="flex justify-center pt-4 pb-2">
            <a
              href="https://www.weddingwaitress.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-full px-5 py-3 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-3"
            >
              <span className="text-sm">💜 Made with</span>
              <img 
                src={weddingWaitressLogo} 
                alt="Wedding Waitress" 
                className="h-10"
              />
            </a>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-8 text-center shadow-xl bg-white/95 backdrop-blur-sm">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-10 h-10 text-white" />
                </div>
                <h1 
                  className="text-3xl font-bold mb-2" 
                  style={{ color: '#000000', textShadow: 'none' }}
                >
                  {displayName}
                </h1>
                {displayDate && (
                  <p className="text-muted-foreground">
                    {format(new Date(displayDate), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
              
              <p className="text-lg text-muted-foreground mb-8">
                Share your favorite moments from this special day!
              </p>

              <Button 
                onClick={() => setFlowStep('add')}
                className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                size="lg"
              >
                📸 Add Photos & Videos
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (flowStep === 'add') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">{displayName}</h1>
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

          <div className="text-center">
            <Button
              variant="link"
              className="text-primary text-lg"
              onClick={() => setShowTextPostModal(true)}
            >
              Or add a text message
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/heic,video/mp4,video/quicktime,video/x-m4v"
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
      </div>
    );
  }

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
                    <img src={item.preview} className="w-full h-full object-contain" alt="" />
                  )}
                  {item.type === 'text' && (
                    <p className="text-center font-medium text-sm line-clamp-6">
                      {item.textContent}
                    </p>
                  )}
                  
                  {/* Upload status indicator */}
                  {item.uploadSuccess === false && (
                    <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center z-10">
                      <div className="text-center text-white p-2">
                        <X className="w-8 h-8 mx-auto mb-1" />
                        <p className="text-xs">Failed</p>
                      </div>
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

  if (flowStep === 'uploading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="ww-box max-w-md w-full">
          <CardContent className="p-12 text-center space-y-8">
            <div className="relative w-48 h-48 mx-auto">
              <svg className="w-full h-full" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" stroke="hsl(var(--muted))" strokeWidth="12" fill="none" />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="hsl(var(--primary))"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="565.48"
                  strokeDashoffset={565.48 - (565.48 * (isChunkedUpload ? chunkedProgress : uploadProgress)) / 100}
                  className="transition-all duration-300"
                  transform="rotate(-90 100 100)"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-primary">
                  {Math.round(isChunkedUpload ? chunkedProgress : uploadProgress)}%
                </span>
                <span className="text-sm text-muted-foreground mt-2">
                  {isChunkedUpload ? 'Chunked upload' : 'Uploading'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Progress value={isChunkedUpload ? chunkedProgress : uploadProgress} className="h-3" />
              <p className="text-muted-foreground">
                {isChunkedUpload 
                  ? `Uploading chunk ${chunkProgresses.filter(c => c.status === 'success').length} / ${chunkProgresses.length}`
                  : `Uploading ${currentUploadIndex} of ${selectedItems.length}`
                }
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Please keep this page open while your memories are being uploaded...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const successCount = selectedItems.filter(item => item.uploadSuccess === true).length;
  const failureCount = selectedItems.filter(item => item.uploadSuccess === false).length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="ww-box max-w-2xl w-full">
        <CardContent className="p-12 text-center space-y-8">
          <div className="text-6xl">{failureCount === 0 ? '✅' : '⚠️'}</div>
          <h1 className="text-4xl font-bold">
            {failureCount === 0 ? 'Your uploads are all in!' : 'Upload Complete with Issues'}
          </h1>
          <p className="text-xl text-muted-foreground">
            {failureCount === 0 
              ? 'Your uploads will show up in the album shortly.'
              : `${successCount} ${successCount === 1 ? 'file' : 'files'} uploaded successfully. ${failureCount} ${failureCount === 1 ? 'file' : 'files'} failed — please try again.`
            }
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setFlowStep('add');
                setSelectedItems([]);
                setUploadProgress(0);
              }}
            >
              Add More
            </Button>
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
              onClick={() => navigate(`/gallery/${eventSlug}`)}
            >
              View Album
            </Button>
          </div>

          {showFooter && (
            <div className="mt-8">
              <a
                href="https://www.weddingwaitress.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-3 text-sm"
              >
                <span>Made with 💜</span>
                <img 
                  src={weddingWaitressLogo} 
                  alt="Wedding Waitress" 
                  className="h-8 inline-block"
                />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
