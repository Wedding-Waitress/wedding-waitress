import React from 'react';
import brownLogo from '@/assets/wedding-waitress-brown-logo.png';

interface Props {
  className?: string;
  /** 'white' (default) or 'brown' transparent logo. */
  tone?: 'white' | 'brown';
}

/** Wedding Waitress logo footer used on guest-facing gallery pages. */
export const GalleryFooterLogo: React.FC<Props> = ({ className = '', tone = 'white' }) => (
  <div className={`flex justify-center ${className}`}>
    <a
      href="https://weddingwaitress.com.au/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Wedding Waitress"
    >
      <img
        src={tone === 'brown' ? brownLogo : '/wedding-waitress-logo.png'}
        alt="Wedding Waitress"
        className="h-10 w-auto opacity-90"
        style={tone === 'brown' ? undefined : { filter: 'brightness(0) invert(1)' }}
        loading="lazy"
      />
    </a>
  </div>
);

export default GalleryFooterLogo;
