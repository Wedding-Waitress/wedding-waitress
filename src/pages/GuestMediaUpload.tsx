import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Plus, X, Camera, ArrowLeft, Trash2, Mic } from 'lucide-react';
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

const AudioRecorderModal = React.lazy(() =>
  import('@/components/Dashboard/PhotoVideoSharing/AudioRecorderModal').then(m => ({ default: m.AudioRecorderModal }))
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
  duration?: number; // Video duration in seconds
  validationStatus?: 'pending' | 'valid' | 'invalid';
  validationError?: string;
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
  const { gallerySlug } = useParams<{ gallerySlug: string }>();
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
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  
  // Chunked upload state
  const [isChunkedUpload, setIsChunkedUpload] = useState(false);
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFooter, setShowFooter] = useState(true);
  const [showPublicGallery, setShowPublicGallery] = useState(true);
  
  // Enhanced progress tracking
  const [uploadSpeed, setUploadSpeed] = useState<number>(0); // MB/s
  const [uploadETA, setUploadETA] = useState<number>(0); // seconds
  const [uploadStartTime, setUploadStartTime] = useState<number>(0);
  const [uploadedBytes, setUploadedBytes] = useState<number>(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Constants for validation
const MAX_VIDEO_SIZE_MB = 2048; // 2 GB max (increased from 1 GB)
const MAX_VIDEO_DURATION_SECONDS = 300; // 5 minutes (increased from 3 minutes)
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
    if (gallerySlug) {
      fetchEventData();
      generateOrGetToken();
    }
  }, [gallerySlug]);

  // Set page title
  useEffect(() => {
    if (eventData?.name) {
      document.title = `${eventData.name} | Wedding Waitress`;
    }
  }, [eventData?.name]);

  const fetchEventData = async () => {
    try {
      console.log('🔍 Fetching gallery data for slug:', gallerySlug);
      
      const { data: gallery } = await supabase
        .from('galleries' as any)
        .select('id, title, show_footer, show_public_gallery, is_active, event_date')
        .eq('slug', gallerySlug)
        .maybeSingle();

      if (!gallery) {
        console.error('❌ Gallery not found for slug:', gallerySlug);
        throw new Error('Gallery not found');
      }

      console.log('✅ Gallery found:', gallery);

      // Check if gallery is visible
      if (!(gallery as any).is_active || !(gallery as any).show_public_gallery) {
        console.warn('⚠️ Gallery is not active or not public');
        setEventData(null);
        setLoading(false);
        return;
      }

      // Set gallery data immediately - this is what we need for uploads
      setGalleryId((gallery as any).id);
      setGalleryTitle((gallery as any).title);
      setShowFooter((gallery as any).show_footer ?? true);
      setShowPublicGallery((gallery as any).show_public_gallery ?? true);
      
      // Create a fallback event data object from gallery info
      const fallbackEventData: EventData = {
        id: (gallery as any).id,
        name: (gallery as any).title,
        event_display_name: (gallery as any).title,
        date: (gallery as any).event_date || new Date().toISOString().split('T')[0],
        event_date_override: null,
        slug: gallerySlug!,
      };
      
      // Try to fetch event data for display purposes, but don't fail if not found
      const { data: eventDataFromDB } = await supabase
        .from('events')
        .select('*')
        .eq('slug', gallerySlug)
        .maybeSingle();

      // Use event data if found, otherwise use fallback from gallery
      setEventData(eventDataFromDB || fallbackEventData);
      console.log('✅ Event data set:', eventDataFromDB || fallbackEventData);
      
    } catch (error) {
      console.error('❌ Error fetching gallery/event:', error);
      toast({
        title: 'Error',
        description: 'Failed to load gallery. Please check the link and try again.',
        variant: 'destructive',
      });
      setEventData(null);
    } finally {
      setLoading(false);
    }
  };

  const generateOrGetToken = () => {
    const storageKey = `guest_token_${gallerySlug}`;
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
          const minutes = Math.floor(duration / 60);
          const seconds = Math.round(duration % 60);
          const maxMinutes = Math.floor(MAX_VIDEO_DURATION_SECONDS / 60);
          resolve({ 
            valid: false, 
            error: `Video is too long (${minutes}:${String(seconds).padStart(2, '0')}). Maximum duration: ${maxMinutes} minutes.` 
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
    try {
      console.log('📁 File selection started');
      const files = Array.from(e.target.files || []);
      console.log(`📁 ${files.length} files selected`);
      const newItems: MediaItem[] = [];

      for (const file of files) {
        try {
          console.log(`Processing ${file.name} (${file.type})`);
          
          // Detect video by type OR extension (iOS sometimes gives empty type)
          const isVideo = file.type.startsWith('video/') || 
                         file.name.match(/\.(mov|mp4|m4v|webm)$/i);
          
          // Track video duration for later use
          let videoDuration: number | undefined = undefined;
          
          // Validate video format
          if (isVideo && file.type && !SUPPORTED_VIDEO_TYPES.includes(file.type)) {
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
            
            // Validate video duration - show loading state
            console.log(`🎬 Validating video: ${file.name}`);
            toast({
              title: 'Validating Video...',
              description: `Checking ${file.name}`,
            });
            
            const validation = await validateVideo(file);
            if (!validation.valid) {
              console.error(`❌ Video validation failed: ${validation.error}`);
              toast({
                title: '❌ Video Invalid',
                description: validation.error,
                variant: 'destructive',
              });
              continue;
            }
            
            console.log(`✅ Video validated: ${file.name} (${validation.duration?.toFixed(1)}s)`);
            
            // Log detailed video info (reuse sizeMB from above)
            const estimatedUploadTime = Math.round(sizeMB / 2); // Assuming 2MB/s
            console.log('📊 Video Details:', {
              name: file.name,
              size: `${sizeMB.toFixed(2)} MB`,
              duration: `${validation.duration?.toFixed(1)}s`,
              type: file.type,
              estimatedUploadTime: `${estimatedUploadTime} seconds (assuming 2MB/s)`,
            });
            
            toast({
              title: '✅ Video Ready',
              description: `${file.name} is ready to upload`,
            });
            
            // Store video duration for later use
            videoDuration = validation.duration;
          }
          
          const preview = URL.createObjectURL(file);

          // For videos, generate a thumbnail from the first frame
          let thumbnail = preview;
          if (isVideo) {
            try {
              thumbnail = await generateVideoThumbnail(file);
            } catch (thumbError) {
              console.warn('Thumbnail generation failed, using fallback:', thumbError);
              // Continue with video preview URL as fallback
            }
          }

          newItems.push({
            file,
            type: isVideo ? 'video' : 'photo',
            preview: thumbnail,
            caption: '',
            duration: isVideo ? videoDuration : undefined,
            validationStatus: 'valid',
          });
          console.log(`✅ Added ${file.name} as ${isVideo ? 'video' : 'photo'}`);
        } catch (fileError) {
          console.error(`Error processing ${file.name}:`, fileError);
          toast({
            title: 'File Processing Error',
            description: `Couldn't process ${file.name}. Please try again.`,
            variant: 'destructive',
          });
        }
      }
      
      console.log(`✅ ${newItems.length} valid items after processing`);
      
      if (newItems.length === 0) {
        toast({
          title: 'No Files Added',
          description: 'Files were unsupported, too large (>200 MB), or too long (>5 min).',
          variant: 'destructive',
        });
        return;
      }
      
      // Use functional state update to avoid stale state
      setSelectedItems(prev => [...prev, ...newItems]);
      setFlowStep('preview');
      console.log(`✅ Moving to preview with ${newItems.length} items`);
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

  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      const timeout = setTimeout(() => {
        cleanup();
        // Fallback: return play button overlay SVG
        const fallback = 'data:image/svg+xml;base64,' + btoa(`
          <svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="300" fill="#1a1a1a"/>
            <circle cx="200" cy="150" r="40" fill="rgba(255,255,255,0.9)"/>
            <polygon points="185,135 185,165 215,150" fill="#1a1a1a"/>
          </svg>
        `);
        resolve(fallback);
      }, 15000); // Increased from 8s to 15s for slow mobile networks

      const cleanup = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(video.src);
        video.remove();
      };

      video.onloadeddata = () => {
        // Seek to 0.1 seconds for a better first frame
        video.currentTime = Math.min(0.1, video.duration * 0.05);
      };

      video.onseeked = () => {
        try {
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            throw new Error('Invalid video dimensions');
          }

          // Set canvas size to video dimensions
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          if (!ctx) throw new Error('Canvas context unavailable');
          
          // Draw video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to blob and create URL
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              cleanup();
              resolve(url);
            } else {
              cleanup();
              // Fallback if blob creation fails
              const fallback = 'data:image/svg+xml;base64,' + btoa(`
                <svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
                  <rect width="400" height="300" fill="#2a2a2a"/>
                  <circle cx="200" cy="150" r="40" fill="rgba(255,255,255,0.9)"/>
                  <polygon points="185,135 185,165 215,150" fill="#2a2a2a"/>
                </svg>
              `);
              resolve(fallback);
            }
          }, 'image/jpeg', 0.85);
        } catch (error) {
          console.error('Thumbnail generation error:', error);
          cleanup();
          // Fallback on error
          const fallback = 'data:image/svg+xml;base64,' + btoa(`
            <svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="300" fill="#333"/>
              <circle cx="200" cy="150" r="40" fill="rgba(255,255,255,0.9)"/>
              <polygon points="185,135 185,165 215,150" fill="#333"/>
            </svg>
          `);
          resolve(fallback);
        }
      };

      video.onerror = (e) => {
        console.error('Video loading error:', e);
        cleanup();
        // Fallback on load error
        const fallback = 'data:image/svg+xml;base64,' + btoa(`
          <svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="300" fill="#444"/>
            <circle cx="200" cy="150" r="40" fill="rgba(255,255,255,0.9)"/>
            <polygon points="185,135 185,165 215,150" fill="#444"/>
          </svg>
        `);
        resolve(fallback);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleAudioUpload = async (audioBlob: Blob, duration: number) => {
    if (!galleryId || !token) {
      toast({
        title: 'Missing Information',
        description: 'Gallery data not available. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (!audioBlob) {
      toast({
        title: 'No Recording Found',
        description: 'Please record first.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingAudio(true);

    try {
      console.log('🎤 Uploading audio guestbook message...');
      
      // Validate audio size BEFORE upload
      const MAX_AUDIO_SIZE_MB = 250;
      const sizeMB = audioBlob.size / (1024 * 1024);
      
      if (sizeMB > MAX_AUDIO_SIZE_MB) {
        throw new Error(`Audio file too large (${sizeMB.toFixed(1)}MB). Maximum is ${MAX_AUDIO_SIZE_MB}MB. Try a shorter message.`);
      }
      
      // Validate audio format
      const contentType = audioBlob.type || 'audio/webm';
      const SUPPORTED_AUDIO = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/m4a'];
      
      if (!SUPPORTED_AUDIO.some(type => contentType.includes(type.split('/')[1]))) {
        throw new Error('Audio format not supported. Please record again.');
      }
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
      const random4 = Math.random().toString(36).substr(2, 4).toUpperCase();
      const eventName = galleryTitle || eventData?.name || 'Event';
      
      let ext = 'webm';
      if (contentType.includes('mp4') || contentType.includes('m4a')) {
        ext = 'm4a';
      } else if (contentType.includes('mpeg') || contentType.includes('mp3')) {
        ext = 'mp3';
      }
      
      const filename = `${dateStr}_${timeStr}-Audio-${eventName}-${random4}.${ext}`;
      
      console.log('📊 Audio Details:', {
        size: `${sizeMB.toFixed(2)} MB`,
        duration: `${Math.round(duration)}s`,
        format: contentType,
        filename,
      });
      console.log('📤 Guest upload starting');

      const { data: urlData, error: urlError } = await supabase.functions.invoke('create-media-upload-url', {
        body: {
          gallerySlug: gallerySlug,
          filename: filename,
          contentType: contentType,
          file_size: audioBlob.size,
          duration_seconds: Math.round(duration),
        },
      });

      if (urlError) {
        console.error('❌ Audio upload URL error:', urlError);
        
        // Enhanced HTTP error handling
        if (urlError.status === 403) {
          throw new Error('Gallery not accepting uploads. Contact event host.');
        } else if (urlError.status === 413) {
          const sizeMB = Math.round(audioBlob.size / (1024 * 1024));
          throw new Error(`Audio file too large (${sizeMB}MB). Maximum size is 250MB.`);
        } else if (urlError.status === 415) {
          throw new Error('Audio format not supported. Please try recording again.');
        } else if (urlError.status === 429) {
          throw new Error('Too many upload attempts. Please wait a minute and try again.');
        } else if (urlError.status >= 500) {
          throw new Error('Server error. Please try again in a few moments.');
        }
        
        throw new Error(urlError.message || 'Could not start upload');
      }

      console.log('✅ Got signed URL:', urlData.file_path);

      const { error: uploadError } = await supabase.storage
        .from('event-media')
        .uploadToSignedUrl(
          urlData.file_path,
          urlData.token,
          audioBlob,
          { contentType: contentType }
        );

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error('Upload failed. Please try again.');
      }

      console.log('✅ Blob uploaded successfully');

      const { error: confirmError } = await supabase.functions.invoke('confirm-media-upload', {
        body: {
          gallery_id: urlData.gallery_id,
          upload_token: urlData.token,
          file_path: urlData.file_path,
          type: 'audio',
          post_type: 'audio',
          caption: null,
          file_size: audioBlob.size,
          mime_type: contentType,
          duration_seconds: Math.round(duration),
        },
      });

      if (confirmError) {
        console.error('❌ Confirm error:', confirmError);
        throw new Error('Could not save audio record');
      }

      console.log('✅ Audio guestbook message uploaded successfully!');

      toast({
        title: '✅ Success!',
        description: 'Your audio guestbook message has been uploaded successfully!',
      });

      setShowAudioRecorder(false);
      setFlowStep('success');

    } catch (error: any) {
      console.error('❌ Audio upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload audio message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAudio(false);
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
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    // Validate we have necessary data
    if (!galleryId) {
      toast({
        title: 'Error',
        description: 'Gallery not loaded. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        title: 'No Items',
        description: 'Please select photos or videos to upload.',
        variant: 'destructive',
      });
      return;
    }

    console.log('🚀 Starting upload for', selectedItems.length, 'items');
    console.log('📦 Gallery ID:', galleryId);
    
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

    console.log('📊 Upload Summary:', {
      total: uploadedItems.length,
      successful: successCount,
      failed: failureCount,
      items: uploadedItems.map(item => ({
        name: item.file?.name || item.textContent?.substring(0, 20),
        type: item.type,
        status: item.uploadSuccess ? 'success' : 'failed',
        error: item.uploadError,
      })),
    });

    if (failureCount > 0) {
      // Keep only failed items selected for retry
      const failedItems = uploadedItems.filter(item => !item.uploadSuccess);
      setSelectedItems(failedItems);
      
      toast({
        title: '❌ Upload Failed',
        description: `${failureCount} ${failureCount === 1 ? 'file' : 'files'} failed. You can retry below.`,
        variant: 'destructive',
        duration: 10000,
      });
      setFlowStep('preview');
    } else {
      setFlowStep('success');
      
      // Auto-return to landing after 2 seconds on complete success
      setTimeout(() => {
        setSelectedItems([]);
        setUploadProgress(0);
        setFlowStep('landing');
      }, 2000);
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

  // Helper: Get safe content type (handles iOS .mov empty type issue)
  const getSafeContentType = (file: File): string => {
    if (file.type && file.type !== '') return file.type;
    
    // Infer from extension for iOS files with empty MIME type
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      mov: 'video/quicktime',
      mp4: 'video/mp4',
      m4v: 'video/x-m4v',
      webm: 'video/webm',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    return mimeMap[ext] || 'application/octet-stream';
  };

  const uploadMediaFile = async (item: MediaItem) => {
    if (!item.file) return;

    // Guard: Validate required parameters before upload
    if (!gallerySlug) {
      console.error('❌ Gallery identifier missing from URL');
      toast({
        title: 'Invalid Album Link',
        description: 'Album link is invalid. Please rescan the QR code.',
        variant: 'destructive',
      });
      return;
    }

    if (!galleryId) {
      console.error('❌ Gallery ID not loaded');
      toast({
        title: 'Upload Error',
        description: 'Gallery not ready. Please refresh and try again.',
        variant: 'destructive',
      });
      return;
    }

    // Enhanced logging for upload start
    const safeContentType = getSafeContentType(item.file);
    
    // Validate file format BEFORE requesting upload URL
    if (item.type === 'video') {
      const SUPPORTED_FORMATS = ['.mp4', '.mov', '.webm', '.m4v'];
      const fileExt = item.file.name.split('.').pop()?.toLowerCase();
      
      if (fileExt && !SUPPORTED_FORMATS.includes(`.${fileExt}`)) {
        throw new Error(`File format .${fileExt} not supported. Use MP4, MOV, or WebM for videos.`);
      }
    }
    
    console.log('📤 Guest upload starting', {
      gallerySlug,
      galleryId,
      filename: item.file?.name,
      size: item.file?.size,
      originalType: item.file?.type,
      normalizedType: safeContentType,
      sizeMB: (item.file?.size || 0) / (1024 * 1024),
      duration: item.duration,
    });
    
    // Initialize upload tracking
    setUploadStartTime(Date.now());
    setUploadedBytes(0);

    const MAX_RETRIES = 3;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
      try {
        // Log request for debugging
        console.log('Requesting upload URL (attempt ' + (retryCount + 1) + '):', {
          filename: item.file.name,
          contentType: safeContentType,
          file_size: item.file.size,
          duration_seconds: item.duration,
          gallerySlug: gallerySlug,
        });

        // Check if we should use chunked upload
        const { data: urlData, error: urlError } = await supabase.functions.invoke(
          'create-media-upload-url',
          {
            body: {
              gallerySlug: gallerySlug,
              filename: item.file.name,
              contentType: safeContentType, // Use normalized content type
              file_size: item.file.size,
              duration_seconds: item.duration || undefined, // Send duration for videos
            },
          }
        );

        if (urlError) {
          // Enhanced error logging with analytics
          console.error('Upload URL error:', {
            error: urlError,
            status: urlError.status,
            message: urlError.message,
            context: urlError.context,
            request: {
              gallerySlug: gallerySlug,
              filename: item.file.name,
              contentType: safeContentType,
              file_size: item.file.size,
              duration_seconds: item.duration,
            }
          });

          // Log failure to analytics (Priority 3)
          try {
            await supabase.functions.invoke('log-upload-failure', {
              body: {
                gallery_slug: gallerySlug,
                error_type: 'upload_url_request_failed',
                error_message: urlError.message || 'Unknown error',
                status_code: urlError.status,
                file_name: item.file.name,
                file_size: item.file.size,
                content_type: safeContentType,
                user_agent: navigator.userAgent,
              },
            });
          } catch (logError) {
            // Non-blocking - just log to console
            console.warn('Failed to log upload failure:', logError);
          }

          // Parse specific error types for user-friendly messages (Priority 2)
          if (urlError.status === 400) {
            const errorMsg = urlError.message || '';
            
            if (errorMsg.includes('Missing required fields')) {
              throw new Error(`Invalid request to server: ${errorMsg}. Please try again.`);
            } else if (errorMsg.includes('type') || errorMsg.includes('format')) {
              throw new Error(`File type "${safeContentType}" isn't supported. Please use MP4, MOV, JPG, or PNG.`);
            } else {
              throw new Error(`Request validation failed: ${errorMsg}`);
            }
          } else if (urlError.status === 403) {
            throw new Error('Gallery not accepting uploads right now. Contact the event host.');
          } else if (urlError.status === 413) {
            const sizeMB = Math.round(item.file.size / (1024 * 1024));
            throw new Error(`File too large (${sizeMB} MB). Max: 2 GB for videos, 250 MB for photos.`);
          } else if (urlError.status === 415) {
            throw new Error(`File type "${safeContentType}" not supported. Use MP4, MOV, JPG, or PNG.`);
          } else if (urlError.status === 429) {
            throw new Error('Too many upload attempts. Please wait a minute and try again.');
          } else if (urlError.status >= 500) {
            throw new Error('Server error. Please try again in a few minutes.');
          } else if (urlError.message?.includes('network') || urlError.message?.includes('timeout')) {
            throw new Error('Upload timed out. Check your connection and try a smaller file.');
          } else if (urlError.message?.includes('token')) {
            throw new Error('Upload link expired. Please rescan the QR code.');
          }

          throw urlError;
        }

        // Priority 1: Handle Cloudflare Stream response for videos
        if (urlData.stream_upload_url && urlData.stream_uid) {
          console.log('☁️ Using Cloudflare Stream for video...');
          
          try {
            // Upload to Cloudflare using Direct Creator Upload
            const formData = new FormData();
            formData.append('file', item.file);
            
            const cfUploadRes = await fetch(urlData.stream_upload_url, {
              method: 'POST',
              body: formData,
            });
            
            if (!cfUploadRes.ok) {
              const errorText = await cfUploadRes.text();
              console.error('Cloudflare Stream upload failed:', errorText);
              throw new Error('Cloudflare Stream upload failed');
            }
            
            console.log('✅ Video uploaded to Cloudflare Stream');
            
            // Confirm upload to database
            const { error: confirmError } = await supabase.functions.invoke('confirm-media-upload', {
              body: {
                gallery_id: urlData.gallery_id,
                upload_token: token,
                type: 'video',
                post_type: 'video',
                caption: item.caption || null,
                file_size: item.file.size,
                mime_type: safeContentType,
                cloudflare_stream_uid: urlData.stream_uid,
                duration_seconds: item.duration || null,
                thumbnail_url: null, // Cloudflare generates poster automatically
              },
            });
            
            if (confirmError) {
              console.error('Failed to confirm Cloudflare Stream upload:', confirmError);
              throw confirmError;
            }
            
            console.log('✅ Cloudflare Stream video confirmed in database');
            return; // Exit early - upload complete
          } catch (streamError) {
            console.error('Cloudflare Stream upload error:', streamError);
            
            // Log to analytics (Priority 3)
            try {
              await supabase.functions.invoke('log-upload-failure', {
                body: {
                  gallery_slug: gallerySlug,
                  error_type: 'cloudflare_stream_upload_failed',
                  error_message: streamError instanceof Error ? streamError.message : 'Unknown error',
                  file_name: item.file.name,
                  file_size: item.file.size,
                  content_type: safeContentType,
                  user_agent: navigator.userAgent,
                },
              });
            } catch {}
            
            throw streamError;
          }
        }

        // If response indicates multipart upload
        if (urlData.use_multipart) {
          // Priority 2: Validate gallerySlug before chunked upload
          if (!gallerySlug) {
            throw new Error('Gallery identifier missing. Cannot start chunked upload.');
          }
          
          setIsChunkedUpload(true);
          const mediaId = await uploadChunked(item.file, item.caption || undefined);
          if (!mediaId) {
            throw new Error('Chunked upload failed');
          }
          return;
      } else if (!urlData?.file_path || !urlData?.token) {
        console.error('❌ Invalid upload credentials received', { 
          urlData,
          has_file_path: !!urlData?.file_path,
          has_token: !!urlData?.token,
          has_signed_url: !!urlData?.signed_url
        });
        toast({
          title: 'Upload Error',
          description: 'Could not start upload. Please try again or contact support.',
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Valid upload credentials received', {
        file_path: urlData.file_path,
        has_token: true,
        gallery_id: urlData.gallery_id
      });

      // Standard single-file upload for smaller files
      setIsChunkedUpload(false);

      // Use Supabase's official uploadToSignedUrl method with normalized content type
      const { error: uploadError } = await supabase.storage
        .from('event-media')
        .uploadToSignedUrl(
          urlData.file_path,
          urlData.token,
          item.file,
          { contentType: safeContentType } // Use normalized content type
        );

      if (uploadError) {
        console.error('❌ Upload failed:', uploadError);
        
        // Log to analytics (Priority 3)
        try {
          await supabase.functions.invoke('log-upload-failure', {
            body: {
              gallery_slug: gallerySlug,
              error_type: 'storage_upload_failed',
              error_message: uploadError.message || 'Unknown error',
              file_name: item.file.name,
              file_size: item.file.size,
              content_type: safeContentType,
              user_agent: navigator.userAgent,
            },
          });
        } catch {}
        
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ Upload successful:', {
        filename: item.file.name,
        size: `${(item.file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: item.type,
        path: urlData.file_path,
      });

      // Generate and upload thumbnail for videos
      let thumbnailUrl: string | null = null;
      if (item.type === 'video' && item.file) {
        try {
          console.log('🖼️ Generating video thumbnail...');
          
          // Generate thumbnail blob (reuse existing generateVideoThumbnail function)
          const thumbnailDataUrl = await generateVideoThumbnail(item.file);
          
          // Convert data URL to blob
          const response = await fetch(thumbnailDataUrl);
          const thumbnailBlob = await response.blob();
          
          console.log('📤 Requesting thumbnail upload URL...');
          
          // Request upload URL for thumbnail
          const { data: thumbUrlData, error: thumbUrlError } = await supabase.functions.invoke(
            'create-media-upload-url',
            {
              body: {
                gallerySlug: gallerySlug,
                filename: `${item.file.name}_thumb.jpg`,
                contentType: 'image/jpeg',
                file_size: thumbnailBlob.size,
              },
            }
          );
          
          if (!thumbUrlError && thumbUrlData?.file_path && thumbUrlData?.token) {
            console.log('📤 Uploading thumbnail...');
            
            // Upload thumbnail using Supabase's official method
            const { error: thumbUploadError } = await supabase.storage
              .from('event-media')
              .uploadToSignedUrl(
                thumbUrlData.file_path,
                thumbUrlData.token,
                thumbnailBlob,
                { contentType: 'image/jpeg' }
              );
            
            if (!thumbUploadError) {
              thumbnailUrl = thumbUrlData.file_path;
              console.log('✅ Thumbnail uploaded:', thumbnailUrl);
            }
          }
        } catch (error) {
          console.error('⚠️ Failed to generate/upload thumbnail:', error);
          // Non-fatal error - continue with upload
        }
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
        thumbnail_url: thumbnailUrl, // Include thumbnail URL
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
        
        // Success - break out of retry loop
        return;
      } catch (error: any) {
        retryCount++;
        
        // Log full error details
        console.error(`Upload failed (attempt ${retryCount}/${MAX_RETRIES}):`, {
          error,
          file: {
            name: item.file?.name,
            type: item.file?.type,
            size: item.file?.size,
          },
          stack: error.stack,
        });
        
        // If this is the last retry, log final failure and throw
        if (retryCount >= MAX_RETRIES) {
          // Log final failure to analytics (Priority 3)
          try {
            await supabase.functions.invoke('log-upload-failure', {
              body: {
                gallery_slug: gallerySlug,
                error_type: 'upload_max_retries_exceeded',
                error_message: error.message || 'Unknown error',
                file_name: item.file?.name,
                file_size: item.file?.size,
                content_type: safeContentType,
                user_agent: navigator.userAgent,
                retry_count: retryCount,
              },
            });
          } catch {}
          
          throw new Error(`Upload failed after ${MAX_RETRIES} attempts: ${error.message || 'Unknown error'}`);
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Add to Album - Wedding Waitress</title>
          <meta name="description" content="Upload your photos and videos to the event album" />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary">
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </>
    );
  }

  if (!eventData) {
    return (
      <>
        <Helmet>
          <title>Gallery Not Available - Wedding Waitress</title>
          <meta name="description" content="This gallery is not currently available" />
        </Helmet>
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
      </>
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
      <>
        <Helmet>
          <title>{displayName} - Add to Album - Wedding Waitress</title>
          <meta name="description" content={`Upload your photos and videos to ${displayName}'s event album`} />
        </Helmet>
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

              <div className="space-y-3">
                <Button 
                  onClick={() => setFlowStep('add')}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                  size="lg"
                >
                  📸 Add Photos & Videos
                </Button>
                
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full text-lg py-6 rounded-2xl border-2 bg-white hover:bg-white/90 min-h-[48px]"
                  style={{ borderColor: '#6D28D9', color: '#6D28D9' }}
                  onClick={() => setShowAudioRecorder(true)}
                >
                  <Mic className="w-6 h-6 mr-3" style={{ color: '#6D28D9' }} />
                  Record Audio Guestbook
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
      </>
    );
  }

  if (flowStep === 'add') {
    return (
      <>
        <Helmet>
          <title>Add Photos & Videos - Wedding Waitress</title>
          <meta name="description" content="Select photos and videos to upload to the event album" />
        </Helmet>
        <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">{displayName}</h1>
            <Button variant="ghost" onClick={() => setFlowStep('landing')}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <Card 
            className="border-2 border-dashed cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderColor: '#6D28D9', backgroundColor: 'rgba(109, 40, 217, 0.05)' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="p-12 text-center space-y-4">
              <Camera className="w-16 h-16 mx-auto" style={{ color: '#6D28D9' }} />
              <h3 className="text-2xl font-semibold">📸 Pick Photos & Videos</h3>
              <p className="text-muted-foreground">
                Tap here to select from your gallery, take a photo, or choose files
              </p>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              variant="link"
              className="text-lg"
              style={{ color: '#6D28D9' }}
              onClick={() => setShowTextPostModal(true)}
            >
              Or add a text message
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
      </>
    );
  }

  if (flowStep === 'preview') {
    const hasFailedItems = selectedItems.some(item => item.uploadSuccess === false);
    const failedCount = selectedItems.filter(item => item.uploadSuccess === false).length;
    
    return (
      <>
        <Helmet>
          <title>Preview - Wedding Waitress</title>
          <meta name="description" content="Preview your photos and videos before uploading" />
        </Helmet>
        <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Preview Your Uploads</h2>
            <Button variant="ghost" onClick={() => setFlowStep('add')}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </div>

          {/* Failed uploads retry section */}
          {hasFailedItems && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-destructive font-semibold mb-3">
                ❌ {failedCount} {failedCount === 1 ? 'file' : 'files'} failed to upload
              </p>
              <Button 
                onClick={handleUploadAll} 
                className="w-full"
                variant="destructive"
              >
                🔄 Retry Failed Uploads
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {selectedItems.map((item, index) => (
              <div key={index} className="relative group">
                <div className={`relative border-2 rounded-none overflow-hidden ${
                  item.type === 'text' 
                    ? 'aspect-square flex items-center justify-center p-3' 
                    : 'aspect-square bg-black'
                }`} style={item.type === 'text' ? { background: item.themeBg, borderColor: '#6D28D9' } : { borderColor: '#6D28D9' }}>
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
              className="w-full hover:opacity-90 shadow-lg text-lg py-6"
              style={{ backgroundColor: '#6D28D9', color: '#FFFFFF' }}
              onClick={handleUploadAll}
            >
              Upload {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
            </Button>
          </div>
        </div>
      </div>
      </>
    );
  }

  if (flowStep === 'uploading') {
    const currentProgress = isChunkedUpload ? chunkedProgress : uploadProgress;
    
    return (
      <>
        <Helmet>
          <title>Uploading - Wedding Waitress</title>
          <meta name="description" content="Uploading your photos and videos" />
        </Helmet>
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
                  strokeDashoffset={565.48 - (565.48 * currentProgress) / 100}
                  className="transition-all duration-300"
                  transform="rotate(-90 100 100)"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-primary">
                  {Math.round(currentProgress)}%
                </span>
                <span className="text-sm text-muted-foreground mt-2">
                  {isChunkedUpload ? 'Chunked upload' : 'Uploading'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Progress value={currentProgress} className="h-3" />
              <p className="text-muted-foreground">
                {isChunkedUpload 
                  ? `Uploading chunk ${chunkProgresses.filter(c => c.status === 'success').length} / ${chunkProgresses.length}`
                  : `Uploading ${currentUploadIndex} of ${selectedItems.length}`
                }
              </p>
              
              {/* Show upload speed and ETA if available */}
              {uploadSpeed > 0 && (
                <p className="text-sm text-muted-foreground">
                  {uploadSpeed.toFixed(2)} MB/s • ETA: {uploadETA}s
                </p>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Please keep this page open while your memories are being uploaded...
            </p>
          </CardContent>
        </Card>
      </div>
      </>
    );
  }

  const successCount = selectedItems.filter(item => item.uploadSuccess === true).length;
  const failureCount = selectedItems.filter(item => item.uploadSuccess === false).length;

  return (
    <>
      <Helmet>
        <title>Upload Complete - Wedding Waitress</title>
        <meta name="description" content="Your photos and videos have been uploaded" />
      </Helmet>
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
              onClick={() => navigate(`/gallery/${gallerySlug}`)}
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
    </>
  );
};
