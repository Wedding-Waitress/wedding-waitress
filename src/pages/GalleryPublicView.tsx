import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { GalleryHeader } from '@/components/Gallery/GalleryHeader';
import { ActionButtons } from '@/components/Gallery/ActionButtons';
import { UploadMediaSheet } from '@/components/Gallery/UploadMediaSheet';
import { GuestbookSheet } from '@/components/Gallery/GuestbookSheet';
import { VoiceRecorderSheet } from '@/components/Gallery/VoiceRecorderSheet';
import { MediaGallery } from '@/components/Gallery/MediaGallery';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { Loader2 } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  date: string;
  partner1_name: string | null;
  partner2_name: string | null;
  slug: string;
}

interface GallerySettings {
  id: string;
  event_id: string;
  is_active: boolean;
  max_photo_size_mb: number;
  max_video_size_mb: number;
  max_video_duration_seconds: number;
  max_audio_duration_sec: number;
  max_uploads_per_guest: number | null;
  allow_photos: boolean;
  allow_videos: boolean;
  allow_audio: boolean;
  allow_guestbook: boolean;
  require_approval: boolean;
  album_expires_at?: string;
  watermark_text?: string;
  show_uploader_name?: boolean;
  moderate_before_publish?: boolean;
}

type SheetType = 'upload' | 'guestbook' | 'voice' | 'gallery' | null;

export const GalleryPublicView: React.FC = () => {
  const { gallerySlug, eventSlug } = useParams<{ gallerySlug?: string; eventSlug?: string }>();
  const slug = gallerySlug || eventSlug;
  const { t } = useTranslation(['gallery', 'common']);
  const [event, setEvent] = useState<Event | null>(null);
  const [gallerySettings, setGallerySettings] = useState<GallerySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchEventBySlug = async (retryAttempt = 0) => {
      try {
        setError(null);
        setLoading(true);

        // Check network connectivity first
        if (!navigator.onLine) {
          throw new Error('No internet connection. Please check your network and try again.');
        }

        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, name, date, partner1_name, partner2_name, slug')
          .eq('slug', slug)
          .maybeSingle();

        if (eventError) {
          console.error('Event fetch error - Full details:', {
            message: eventError.message,
            code: eventError.code,
            details: eventError.details,
            hint: eventError.hint,
            slug: slug
          });
          
          // Show specific error messages based on error type
          if (eventError.code === 'PGRST116') {
            throw new Error('Gallery not found');
          } else if (eventError.message?.includes('JWT') || eventError.message?.includes('JWS')) {
            throw new Error('Authentication error - please try again');
          } else {
            throw new Error(eventError.message || 'Failed to load gallery');
          }
        }

        if (!eventData) {
          throw new Error('Gallery not found or no longer active');
        }

        setEvent(eventData);

        const { data: settingsData, error: settingsError } = await supabase
          .from('media_gallery_settings')
          .select('*')
          .eq('event_id', eventData.id)
          .eq('is_active', true)
          .maybeSingle();

        if (settingsError) {
          console.error('Settings fetch error - Full details:', {
            message: settingsError.message,
            code: settingsError.code,
            details: settingsError.details,
            hint: settingsError.hint,
            eventId: eventData.id
          });
        }

        setGallerySettings(settingsData as any);
      } catch (err: any) {
        console.error('Error fetching event - Full details:', {
          error: err,
          message: err.message,
          stack: err.stack,
          slug: slug,
          online: navigator.onLine
        });
        setError(err.message || 'Connection issue');

        // Auto-retry with exponential backoff (max 3 attempts)
        if (retryAttempt < 2 && navigator.onLine) {
          const delay = Math.pow(2, retryAttempt) * 1000;
          setTimeout(() => {
            setRetryCount(retryAttempt + 1);
            fetchEventBySlug(retryAttempt + 1);
          }, delay);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEventBySlug();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-subtle p-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#6D28D9] mb-4" />
        <p className="text-gray-600">Loading gallery...</p>
        {retryCount > 0 && (
          <p className="text-sm text-gray-500 mt-2">Retrying ({retryCount}/3)...</p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center border-2 border-[#6D28D9]">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connection Issue</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#6D28D9] text-white rounded-lg hover:bg-[#5B21B6] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!event || !gallerySettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center border-2 border-[#6D28D9]">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📷</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gallery Not Found</h1>
          <p className="text-gray-600">This gallery may not exist or is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <GalleryHeader event={event} />
      
      {activeSheet !== 'gallery' ? (
        <ActionButtons 
          onAction={setActiveSheet} 
          settings={gallerySettings}
        />
      ) : (
        <MediaGallery 
          eventId={event.id}
          onBack={() => setActiveSheet(null)}
        />
      )}

      <UploadMediaSheet
        open={activeSheet === 'upload'}
        onClose={() => setActiveSheet(null)}
        gallerySlug={slug!}
        eventId={event.id}
        settings={gallerySettings}
        requireApproval={gallerySettings.require_approval || false}
      />

      <GuestbookSheet
        open={activeSheet === 'guestbook'}
        onClose={() => setActiveSheet(null)}
        eventId={event.id}
      />

      <VoiceRecorderSheet
        open={activeSheet === 'voice'}
        onClose={() => setActiveSheet(null)}
        gallerySlug={slug!}
        eventId={event.id}
        settings={gallerySettings}
      />

      <footer className="mt-auto border-t bg-white py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-600">
            <LanguageSelector variant="footer" className="text-xs" />
            <span>•</span>
            <Link to="/privacy" className="hover:text-primary transition-colors">
              {t('common:privacyPolicy')}
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-primary transition-colors">
              {t('common:termsOfService')}
            </Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-primary transition-colors">
              {t('common:contact')}
            </Link>
            <span>•</span>
            <span>{t('common:copyright')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
