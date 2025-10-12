import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X, Camera, ArrowLeft, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TextPostModal } from '@/components/Dashboard/PhotoVideoSharing/TextPostModal';
import { getThemeById } from '@/lib/mediaConstants';

interface MediaItem {
  file?: File;
  type: 'photo' | 'video' | 'text';
  preview?: string;
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

  useEffect(() => {
    if (eventSlug) {
      fetchEventData();
      generateOrGetToken();
    }
  }, [eventSlug]);

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

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: MediaItem[] = files.map(file => ({
      file,
      type: file.type.startsWith('video/') ? 'video' : 'photo',
      preview: URL.createObjectURL(file),
      caption: '',
    }));
    
    setSelectedItems([...selectedItems, ...newItems]);
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
      let errorMsg = 'Failed to upload some items';
      if (error.context?.body) {
        const body = error.context.body;
        if (body.error) {
          errorMsg = body.error;
          if (body.troubleshooting) {
            errorMsg += `. ${body.troubleshooting}`;
          }
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      toast({
        title: 'Error',
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

    if (urlError) throw urlError;

    // Upload to the returned URL (works for both Supabase Storage and Cloudflare Stream)
    const uploadUrl = urlData.signed_url || urlData.uploadURL;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: item.file,
      headers: {
        'Content-Type': item.file.type,
      },
    });

    if (!uploadResponse.ok) throw new Error('Upload failed');

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

  if (flowStep === 'landing') {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <div className="text-center space-y-8 max-w-2xl">
            <div className="text-6xl mb-4">📸</div>
            <h1 className="text-4xl md:text-6xl font-bold">{displayName}</h1>
            <p className="text-xl text-muted-foreground">
              {format(new Date(displayDate), 'MMMM d, yyyy')}
            </p>
            
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-xl px-12 py-8 rounded-2xl"
              onClick={() => setFlowStep('add')}
            >
              <Plus className="w-6 h-6 mr-3" />
              Add to Album
            </Button>
            
          {showFooter && (
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
        </CardContent>
      </Card>
    </div>
  );
};
