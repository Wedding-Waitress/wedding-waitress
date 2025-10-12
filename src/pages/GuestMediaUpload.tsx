import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, Camera, ArrowLeft, Trash2, Play } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TextPostModal } from '@/components/Dashboard/PhotoVideoSharing/TextPostModal';
import { getThemeById } from '@/lib/mediaConstants';
import weddingWaitressLogo from '@/assets/wedding-waitress-badge-logo.png';

interface MediaItem {
  file?: File;
  type: 'photo' | 'video' | 'text';
  preview?: string;
  previewPoster?: string;
  caption?: string;
  textContent?: string;
  themeId?: string;
  themeBg?: string;
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFooter, setShowFooter] = useState(true);
  const [showPublicGallery, setShowPublicGallery] = useState(true);
  const [latestMedia, setLatestMedia] = useState<any>(null);

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

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      selectedItems.forEach(item => {
        if (item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [selectedItems]);

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
      
      // Fetch latest media for background
      const { data: mediaData } = await supabase.rpc('get_public_gallery_media', {
        _event_slug: eventSlug
      });
      
      if (mediaData && (mediaData as any[]).length > 0) {
        const sorted = [...(mediaData as any[])].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setLatestMedia(sorted[0]);
      }
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

  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      video.onloadeddata = () => {
        video.currentTime = 0.5; // Seek to 0.5s
      };
      
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const posterUrl = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(video.src);
        resolve(posterUrl);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(''); // Return empty if thumbnail generation fails
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB
    const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
    
    const validFiles: MediaItem[] = [];
    
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      // Validate file size
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        toast({
          title: 'Image too large',
          description: `${file.name} exceeds 15 MB limit`,
          variant: 'destructive',
        });
        continue;
      }
      
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        toast({
          title: 'Video too large',
          description: `${file.name} exceeds 200 MB limit`,
          variant: 'destructive',
        });
        continue;
      }
      
      const preview = URL.createObjectURL(file);
      const item: MediaItem = {
        file,
        type: isVideo ? 'video' : 'photo',
        preview,
        caption: '',
      };
      
      validFiles.push(item);
    }
    
    if (validFiles.length > 0) {
      setSelectedItems([...selectedItems, ...validFiles]);
      setFlowStep('preview');
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
    const item = selectedItems[index];
    if (item.preview) {
      URL.revokeObjectURL(item.preview);
    }
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (!eventData || selectedItems.length === 0) return;

    setFlowStep('uploading');
    setUploadProgress(0);
    setCurrentUploadIndex(0);

    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        setCurrentUploadIndex(i + 1);

        if (item.type === 'text') {
          await uploadTextPost(item);
        } else {
          await uploadMediaFile(item);
        }

        setUploadProgress(Math.round(((i + 1) / selectedItems.length) * 100));
      }

      setFlowStep('success');
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Extract detailed error message
      let errorMsg = 'Upload failed';
      let errorTitle = 'Error';
      
      if (error.message) {
        if (error.message.includes('too large') || error.message.includes('exceeds')) {
          errorTitle = 'File too large';
          errorMsg = error.message;
        } else if (error.message.includes('Invalid') || error.message.includes('format')) {
          errorTitle = 'Invalid format';
          errorMsg = error.message;
        } else if (error.message.includes('network') || error.message.includes('Network')) {
          errorTitle = 'Network error';
          errorMsg = 'Check your connection and try again';
        } else {
          errorMsg = error.message;
        }
      } else if (error.context?.body) {
        const body = error.context.body;
        if (body.error) {
          errorMsg = body.error;
          if (body.troubleshooting) {
            errorMsg += `. ${body.troubleshooting}`;
          }
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMsg,
        variant: 'destructive',
      });
      setFlowStep('preview');
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
      const errorMsg = urlError.message || 'Failed to get upload URL';
      throw new Error(errorMsg);
    }

    // Upload to the returned URL (works for both Supabase Storage and Cloudflare Stream)
    const uploadUrl = urlData.signed_url || urlData.uploadURL;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: item.file,
      headers: {
        'Content-Type': item.file.type,
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => 'Unknown error');
      throw new Error(`Upload failed: ${errorText}`);
    }

    // Prepare confirmation data based on media type
    const confirmBody: any = {
      gallery_id: galleryId,
      upload_token: token,
      type: item.type === 'video' ? 'video' : 'image',
      post_type: item.type,
      caption: item.caption || null,
      file_size: item.file.size,
      mime_type: item.file.type,
    };

    if (item.type === 'video') {
      // Video: use Cloudflare Stream UID
      confirmBody.cloudflare_stream_uid = urlData.uid;
    } else {
      // Photo: use Supabase file path + dimensions
      confirmBody.file_path = urlData.file_path;
      
      // Get image dimensions
      if (item.preview) {
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
    }

    const { error: confirmError } = await supabase.functions.invoke('confirm-media-upload', {
      body: confirmBody,
    });

    if (confirmError) throw confirmError;
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
        {/* Full-screen background layer */}
        {latestMedia && (
          <div className="fixed inset-0 z-0">
            {latestMedia.type === 'image' && (
              <img 
                src={getMediaUrl(latestMedia.file_url)}
                className="w-full h-full object-cover"
                alt=""
              />
            )}
            {latestMedia.type === 'video' && latestMedia.stream_preview_image && (
              <img 
                src={latestMedia.stream_preview_image}
                className="w-full h-full object-cover"
                alt=""
              />
            )}
            {latestMedia.type === 'text' && latestMedia.theme_id && (
              <div 
                className="w-full h-full"
                style={{ background: getThemeById(latestMedia.theme_id).bgColor }}
              />
            )}
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          </div>
        )}

        {/* Content layer */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header Badge */}
          <div className="flex justify-center pt-4 pb-2">
            <a
              href="https://www.weddingwaitress.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
            >
              <span className="text-sm">💜 Made with</span>
              <img 
                src={weddingWaitressLogo} 
                alt="Wedding Waitress" 
                className="h-5"
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
            accept="image/jpeg,image/png,image/heic,video/mp4,video/quicktime,video/webm"
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
              <Card key={index} className="relative group overflow-hidden border-2 border-primary/20">
                <div className="aspect-square rounded-lg overflow-hidden">
                  {item.type === 'photo' && item.preview && (
                    <img 
                      src={item.preview} 
                      className="w-full h-full object-cover rounded-lg" 
                      style={{ imageRendering: 'auto' }}
                      alt="" 
                    />
                  )}
                  {item.type === 'video' && item.preview && (
                    <div className="relative w-full h-full">
                      <video 
                        src={item.preview}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 rounded-full p-1.5">
                        <Play className="w-4 h-4 text-white" fill="white" />
                      </div>
                    </div>
                  )}
                  {item.type === 'text' && (
                    <div 
                      className="w-full h-full flex items-center justify-center p-4 rounded-lg"
                      style={{ background: item.themeBg }}
                    >
                      <p className="text-center font-medium text-sm line-clamp-6">
                        {item.textContent}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
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
                className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 text-sm"
              >
                <span>Made with 💜</span>
                <img 
                  src={weddingWaitressLogo} 
                  alt="Wedding Waitress" 
                  className="h-4 inline-block"
                />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
