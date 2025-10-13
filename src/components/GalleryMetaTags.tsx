import { Helmet } from 'react-helmet-async';
import React, { useEffect, useState } from 'react';

interface GalleryMetaTagsProps {
  galleryTitle: string;
  eventDate?: string | null;
  gallerySlug: string;
  firstPhotoUrl?: string;
}

export const GalleryMetaTags: React.FC<GalleryMetaTagsProps> = ({
  galleryTitle,
  eventDate,
  gallerySlug,
  firstPhotoUrl,
}) => {
  const galleryUrl = `${window.location.origin}/g/${gallerySlug}`;
  const description = eventDate 
    ? `View the full album of photos & videos from ${new Date(eventDate).toLocaleDateString()}`
    : 'View the full album of photos & videos';
  const imageUrl = firstPhotoUrl || `${window.location.origin}/wedding-waitress-logo.png`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{`${galleryTitle} - Wedding Waitress Gallery`}</title>
      <meta name="title" content={`${galleryTitle} - Wedding Waitress Gallery`} />
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={galleryUrl} />
      <meta property="og:title" content={`🎉 ${galleryTitle} — Wedding Waitress Gallery`} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={galleryUrl} />
      <meta name="twitter:title" content={`🎉 ${galleryTitle} — Wedding Waitress Gallery`} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Canonical URL */}
      <link rel="canonical" href={galleryUrl} />
    </Helmet>
  );
};
