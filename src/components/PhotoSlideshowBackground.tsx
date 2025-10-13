import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Photo {
  id: string;
  file_url: string;
}

interface PhotoSlideshowBackgroundProps {
  photos: Photo[];
  currentIndex: number;
}

export const PhotoSlideshowBackground: React.FC<PhotoSlideshowBackgroundProps> = ({
  photos,
  currentIndex,
}) => {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);

  const getPhotoUrl = (photo: Photo) => {
    const { data } = supabase.storage.from('event-media').getPublicUrl(photo.file_url);
    return data.publicUrl;
  };

  // Preload next image
  useEffect(() => {
    if (photos.length === 0) return;

    const nextIndex = (currentIndex + 1) % photos.length;
    if (!loadedImages.has(nextIndex)) {
      const img = new Image();
      img.src = getPhotoUrl(photos[nextIndex]);
      img.onload = () => {
        setLoadedImages((prev) => new Set(prev).add(nextIndex));
      };
    }
  }, [currentIndex, photos, loadedImages]);

  // Update active index with delay for fade transition
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveIndex(currentIndex);
    }, 50);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  if (photos.length === 0) {
    return <div className="fixed inset-0 z-0 bg-gradient-to-br from-purple-100 via-purple-50 to-blue-50" />;
  }

  return (
    <>
      {/* Gradient fallback */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-purple-100 via-purple-50 to-blue-50" />
      
      {/* Photo layers - render current and next for smooth transition */}
      {photos.map((photo, index) => {
        const isActive = index === activeIndex;
        const isPrevious = index === (activeIndex - 1 + photos.length) % photos.length;
        
        if (!isActive && !isPrevious) return null;

        return (
          <div
            key={photo.id}
            className="fixed inset-0 z-0 transition-opacity duration-[400ms] ease-in-out"
            style={{
              opacity: isActive ? 1 : 0,
              pointerEvents: 'none',
            }}
          >
            <img
              src={getPhotoUrl(photo)}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
              style={{
                imageRendering: 'auto',
              }}
              srcSet={`${getPhotoUrl(photo)} 1x, ${getPhotoUrl(photo)} 2x`}
            />
          </div>
        );
      })}

      {/* Dark gradient overlay for text legibility */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 100%)',
        }}
      />
    </>
  );
};
