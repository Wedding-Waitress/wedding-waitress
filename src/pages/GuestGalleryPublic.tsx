import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Plus, ArrowLeft, X, Camera, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TextPostModal } from '@/components/Dashboard/PhotoVideoSharing/TextPostModal';
import { getThemeById } from '@/lib/mediaConstants';
import { analytics } from '@/lib/analytics';

interface MediaItem {
  id?: string;
  file?: File;
  type: 'photo' | 'video' | 'text';
  preview?: string;
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
}

interface GalleryData {
  id: string;
  title: string;
  event_date: string | null;
  is_active: boolean;
  show_public_gallery: boolean;
  show_footer: boolean;
}

type FlowStep = 'landing' | 'add' | 'preview' | 'uploading' | 'success' | 'view-gallery';

export const GuestGalleryPublic: React.FC = () => {
  const { gallerySlug } = useParams<{ gallerySlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [flowStep, setFlowStep] = useState<FlowStep>('landing');
  const [galleryData, setGalleryData] = useState<GalleryData | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [showTextPostModal, setShowTextPostModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const MAX_VIDEO_SIZE_MB = 200;

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

      // Fetch approved media
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_uploads' as any)
        .select('id, post_type, type, caption, file_url, thumbnail_url, cloudflare_stream_uid, text_content, theme_id, created_at')
        .eq('gallery_id', (gallery as any).id)
        .eq('status', 'approved')
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

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        // Check video size limit
        if (file.type.startsWith('video/')) {
          const sizeMB = file.size / (1024 * 1024);
          if (sizeMB > MAX_VIDEO_SIZE_MB) {
            toast({
              title: 'Video Too Large',
              description: `This video is too large for direct upload (${Math.round(sizeMB)} MB). Please trim it or upload a shorter clip. Max: ${MAX_VIDEO_SIZE_MB} MB`,
              variant: 'destructive',
            });
            return null;
          }
        }

        let processedFile = file;
        
        // Convert HEIC/HEIF to JPEG
        if (file.type === 'image/heic' || file.type === 'image/heif' || 
            file.name.match(/\.(heic|heif)$/i)) {
          try {
            processedFile = await convertHeicToJpeg(file);
            toast({
              title: 'Converted',
              description: `${file.name} converted to JPEG`,
            });
          } catch (error) {
            console.error('HEIC conversion error:', error);
            toast({
              title: 'Warning',
              description: `Failed to convert ${file.name}`,
              variant: 'destructive',
            });
            return null;
          }
        }
        
        return {
          file: processedFile,
          type: processedFile.type.startsWith('video/') ? 'video' : 'photo',
          preview: URL.createObjectURL(processedFile),
          caption: '',
        };
      })
    );
    
    const validItems = processedFiles.filter(item => item !== null) as MediaItem[];
    setSelectedItems([...selectedItems, ...validItems]);
    setFlowStep('preview');
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
          if (error.message === 'FILE_TOO_LARGE') {
            errorMsg = item.type === 'photo' 
              ? 'File too large. Max: 15 MB' 
              : 'File too large. Max: 200 MB';
          } else if (error.message === 'CORS_ERROR') {
            errorMsg = 'Upload blocked by browser (CORS). Please reload and try again.';
          } else if (error.message === 'UNSUPPORTED_TYPE') {
            errorMsg = 'File type not supported';
          } else if (error.message === 'UPLOADS_DISABLED') {
            errorMsg = 'Gallery is not accepting uploads';
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
        fetchGalleryData();
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

    let retryCount = 0;
    const MAX_RETRIES = 1;

    while (retryCount <= MAX_RETRIES) {
      try {
        // Get signed upload URL
        const { data: urlData, error: urlError } = await supabase.functions.invoke(
          'create-media-upload-url',
          {
            body: {
              gallerySlug: gallerySlug,
              filename: item.file.name,
              contentType: item.file.type,
              file_size: item.file.size,
            },
          }
        );

        if (urlError) {
          if (urlError.message?.includes('too large')) {
            throw new Error('FILE_TOO_LARGE');
          }
          if (urlError.message?.includes('not accepting uploads')) {
            throw new Error('UPLOADS_DISABLED');
          }
          if (urlError.message?.includes('not supported')) {
            throw new Error('UNSUPPORTED_TYPE');
          }
          throw urlError;
        }

        // Upload to signed URL
        const uploadResponse = await fetch(urlData.signed_url, {
          method: 'PUT',
          body: item.file,
          headers: {
            'Content-Type': urlData.content_type || item.file.type,
          },
        });

        if (!uploadResponse.ok) {
          if (uploadResponse.status === 413) {
            throw new Error('FILE_TOO_LARGE');
          }
          if (uploadResponse.status === 0) {
            throw new Error('CORS_ERROR');
          }
          if (uploadResponse.status === 403 && retryCount < MAX_RETRIES) {
            retryCount++;
            toast({
              title: 'Retrying',
              description: 'Upload link expired, requesting new one...',
            });
            continue;
          }
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        // Get image dimensions if photo
        let width, height;
        if (item.type === 'photo' && item.preview) {
          const img = new Image();
          await new Promise((resolve) => {
            img.onload = () => {
              width = img.width;
              height = img.height;
              resolve(null);
            };
            img.src = item.preview;
          });
        }

        // Confirm upload
        const { error: confirmError } = await supabase.functions.invoke('confirm-media-upload', {
          body: {
            gallery_id: urlData.gallery_id,
            upload_token: urlData.token,
            file_path: urlData.file_path,
            type: item.type,
            post_type: item.type,
            caption: item.caption || null,
            width,
            height,
            file_size: item.file.size,
            mime_type: urlData.content_type || item.file.type,
          },
        });

        if (confirmError) throw confirmError;

        // Debug info (dev only)
        if (import.meta.env.DEV) {
          setDebugInfo({
            filename: item.file.name,
            type: item.file.type,
            size: item.file.size,
            contentType: urlData.content_type,
            signedUrlStatus: uploadResponse.status,
            confirmStatus: 'success',
          });
        }

        break;
      } catch (error: any) {
        if (retryCount >= MAX_RETRIES) {
          throw error;
        }
        retryCount++;
      }
    }
  };

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from('event-media').getPublicUrl(filePath);
    return data.publicUrl;
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

  // Error states
  if (error || !galleryData) {
    return (
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
    );
  }

  // Landing page
  if (flowStep === 'landing') {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <div className="text-center space-y-8 max-w-2xl">
            <div className="text-6xl mb-4">📸</div>
            <h1 className="text-4xl md:text-6xl font-bold">{galleryData.title}</h1>
            {galleryData.event_date && (
              <p className="text-xl text-muted-foreground">
                {format(new Date(galleryData.event_date), 'MMMM d, yyyy')}
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
              
              {mediaItems.length > 0 && (
                <Button
                  size="lg"
                  variant="outline"
                  className="text-xl px-12 py-8 rounded-2xl"
                  onClick={() => setFlowStep('view-gallery')}
                >
                  View Album
                </Button>
              )}
            </div>
            
            {galleryData.show_footer && (
              <p className="text-sm text-muted-foreground mt-8">
                Made with 💜{' '}
                <a
                  href="https://theweddingwaitress.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  Wedding Waitress
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
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
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelection}
            className="hidden"
          />
        </div>

        <TextPostModal
          open={showTextPostModal}
          onClose={() => setShowTextPostModal(false)}
          onSubmit={handleTextPostSubmit}
        />
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {selectedItems.map((item, index) => (
              <Card key={index} className="relative group overflow-hidden">
                <div className="aspect-square">
                  {item.type === 'photo' && item.preview && (
                    <img src={item.preview} className="w-full h-full object-cover" alt="" />
                  )}
                  {item.type === 'video' && item.preview && (
                    <video src={item.preview} className="w-full h-full object-cover" />
                  )}
                  {item.type === 'text' && (
                    <div 
                      className="w-full h-full flex items-center justify-center p-4"
                      style={{ background: item.themeBg }}
                    >
                      <p className="text-center font-medium text-sm line-clamp-6">
                        {item.textContent}
                      </p>
                    </div>
                  )}
                </div>
                
                {item.uploadError && (
                  <div className="absolute bottom-2 left-2 right-2 bg-destructive text-destructive-foreground text-xs p-2 rounded">
                    {item.uploadError}
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
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
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Uploading {currentUploadIndex} of {selectedItems.length}
              </p>
              <Progress value={(currentUploadIndex / selectedItems.length) * 100} />
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
                onClick={() => {
                  setFlowStep('view-gallery');
                  fetchGalleryData(); // Refresh media
                }}
              >
                View Album
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // View gallery page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">{galleryData.title}</h1>
          {galleryData.event_date && (
            <p className="text-xl opacity-90">
              {format(new Date(galleryData.event_date), 'MMMM d, yyyy')}
            </p>
          )}
        </div>
      </div>

      {/* Sticky Add Button */}
      <div className="sticky top-4 z-50 px-4 py-4 flex justify-center">
        <Button
          size="lg"
          className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg"
          onClick={() => setFlowStep('add')}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add to Album
        </Button>
      </div>

      {/* Masonry Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {mediaItems.length === 0 ? (
          <Card className="ww-box max-w-md mx-auto">
            <CardContent className="p-12 text-center space-y-4">
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-xl font-semibold">No photos yet</h3>
              <p className="text-muted-foreground">
                Be the first to add memories to this album!
              </p>
              <Button
                className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 mt-4"
                onClick={() => setFlowStep('add')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Photos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {mediaItems.map((item) => {
              const theme = item.theme_id ? getThemeById(item.theme_id) : null;
              
              return (
                <Card
                  key={item.id}
                  className="break-inside-avoid mb-4 overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  {item.post_type === 'photo' && (
                    <img
                      src={getMediaUrl(item.file_url!)}
                      alt={item.caption || ''}
                      className="w-full h-auto"
                    />
                  )}
                  {item.post_type === 'video' && (
                    <>
                      {item.cloudflare_stream_uid ? (
                        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                          <iframe
                            src={`https://customer-${item.cloudflare_stream_uid}.cloudflarestream.com/${item.cloudflare_stream_uid}/iframe`}
                            className="absolute top-0 left-0 w-full h-full"
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <video
                          src={getMediaUrl(item.file_url!)}
                          className="w-full h-auto"
                          controls
                        />
                      )}
                    </>
                  )}
                  {item.post_type === 'text' && theme && (
                    <div
                      className="p-8 min-h-[200px] flex items-center justify-center"
                      style={{ background: theme.bgColor }}
                    >
                      <p 
                        className="text-xl text-center font-medium break-words"
                        style={{ color: theme.textColor }}
                      >
                        {item.text_content}
                      </p>
                    </div>
                  )}
                  {item.caption && (
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{item.caption}</p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {galleryData.show_footer && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Made with 💜{' '}
            <a
              href="https://theweddingwaitress.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Wedding Waitress
            </a>
          </p>
        </div>
      )}

      {/* Debug Overlay (Dev Only) */}
      {import.meta.env.DEV && debugInfo && (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white text-xs p-4 rounded-lg max-w-md z-50">
          <h4 className="font-bold mb-2">Debug Info</h4>
          <pre className="overflow-auto max-h-48">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setDebugInfo(null)}
            className="mt-2"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
};