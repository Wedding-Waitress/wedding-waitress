import React from 'react';

interface Props {
  className?: string;
}

/** Wedding Waitress logo footer used on guest-facing gallery pages. */
export const GalleryFooterLogo: React.FC<Props> = ({ className = '' }) => (
  <div className={`flex justify-center ${className}`}>
    <a
      href="https://weddingwaitress.com.au/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Wedding Waitress"
    >
      <img
        src="/wedding-waitress-logo.png"
        alt="Wedding Waitress"
        className="h-10 w-auto opacity-90"
        style={{ filter: 'brightness(0) invert(1)' }}
        loading="lazy"
      />
    </a>
  </div>
);

export default GalleryFooterLogo;
