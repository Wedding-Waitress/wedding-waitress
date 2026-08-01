import React from 'react';

interface Props {
  className?: string;
}

/** Wedding Waitress logo footer used on guest-facing gallery pages. */
export const GalleryFooterLogo: React.FC<Props> = ({ className = '' }) => (
  <div className={`flex justify-center ${className}`}>
    <img
      src="/wedding-waitress-logo.png"
      alt="Wedding Waitress"
      className="h-5 w-auto opacity-90"
      style={{ filter: 'brightness(0) invert(1)' }}
      loading="lazy"
    />
  </div>
);

export default GalleryFooterLogo;
