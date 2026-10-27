import { useState, type ImgHTMLAttributes } from 'react';

type PublicImageProps = ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string };

export function publicImageUrl(src: string, width: number) {
  return `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}&fm=webp&q=82`;
}

/** Responsive delivery for local marketing photos; retain the original if optimization fails. */
export function PublicImage({ src, alt, sizes = '(max-width: 767px) 100vw, 50vw', onError, ...props }: PublicImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const optimized = import.meta.env.PROD && src.startsWith('/') && !src.startsWith('//') && failedSource !== src;
  return <img {...props} src={src} alt={alt} decoding="async" sizes={optimized ? sizes : undefined}
    srcSet={optimized ? [480, 800, 1280].map(width => `${publicImageUrl(src, width)} ${width}w`).join(', ') : undefined}
    onError={event => { setFailedSource(src); onError?.(event); }} />;
}
