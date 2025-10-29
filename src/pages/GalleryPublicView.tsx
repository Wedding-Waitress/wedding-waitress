import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GalleryHeader } from '@/components/Gallery/GalleryHeader';
import { ActionButtons } from '@/components/Gallery/ActionButtons';
import { UploadMediaSheet } from '@/components/Gallery/UploadMediaSheet';
import { GuestbookSheet } from '@/components/Gallery/GuestbookSheet';
import { VoiceRecorderSheet } from '@/components/Gallery/VoiceRecorderSheet';
import { MediaGallery } from '@/components/Gallery/MediaGallery';
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
  max_audio_duration_sec: number;
  max_uploads_per_guest: number | null;
  allow_photos: boolean;
  allow_videos: boolean;
  allow_audio: boolean;
  allow_guestbook: boolean;
  album_expires_at?: string;
  watermark_text?: string;
  show_uploader_name?: boolean;
  moderate_before_publish?: boolean;
}

type SheetType = 'upload' | 'guestbook' | 'voice' | 'gallery' | null;

export const GalleryPublicView: React.FC = () => {
  const { gallerySlug } = useParams<{ gallerySlug: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [gallerySettings, setGallerySettings] = useState<GallerySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  useEffect(() => {
    if (!gallerySlug) return;

    const fetchEventBySlug = async () => {
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, name, date, partner1_name, partner2_name, slug')
          .eq('slug', gallerySlug)
          .single();

        if (eventError) throw eventError;
        if (!eventData) throw new Error('Event not found');

        setEvent(eventData);

        // Fetch gallery settings
        const { data: settingsData } = await supabase
          .from('media_gallery_settings')
          .select('*')
          .eq('event_id', eventData.id)
          .eq('is_active', true)
          .single();

        setGallerySettings(settingsData as any);
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventBySlug();
  }, [gallerySlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Loader2 className="w-8 h-8 animate-spin text-[#6D28D9]" />
      </div>
    );
  }

  if (!event || !gallerySettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gallery Not Found</h1>
          <p className="text-gray-600">This gallery may not exist or is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
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
        gallerySlug={gallerySlug!}
        eventId={event.id}
        settings={gallerySettings}
      />

      <GuestbookSheet
        open={activeSheet === 'guestbook'}
        onClose={() => setActiveSheet(null)}
        eventId={event.id}
      />

      <VoiceRecorderSheet
        open={activeSheet === 'voice'}
        onClose={() => setActiveSheet(null)}
        gallerySlug={gallerySlug!}
        eventId={event.id}
        settings={gallerySettings}
      />
    </div>
  );
};
