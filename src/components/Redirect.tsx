import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const LegacyGalleryRedirect = () => {
  const navigate = useNavigate();
  const { gallerySlug } = useParams<{ gallerySlug: string }>();

  useEffect(() => {
    if (gallerySlug) {
      navigate(`/g/${gallerySlug}`, { replace: true });
    }
  }, [gallerySlug, navigate]);

  return null;
};