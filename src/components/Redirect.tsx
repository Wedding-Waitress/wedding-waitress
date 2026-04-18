/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
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