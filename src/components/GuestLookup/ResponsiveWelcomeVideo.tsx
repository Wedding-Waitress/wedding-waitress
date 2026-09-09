import React, { useEffect, useState } from 'react';

export function welcomeVideoThumbnail(src: string): string | null {
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:' || !(url.hostname === 'iframe.cloudflarestream.com' || /^customer-[a-z0-9-]+\.cloudflarestream\.com$/.test(url.hostname))) return null;
    const id = url.pathname.split('/').filter(Boolean)[0];
    if (!id) return null;
    const origin = url.hostname === 'iframe.cloudflarestream.com' ? 'https://videodelivery.net' : url.origin;
    return origin + '/' + encodeURIComponent(id) + '/thumbnails/thumbnail.jpg?height=640&width=640&fit=clip';
  } catch { return null; }
}

/** Keep the embed's frame proportional to the un-cropped video thumbnail. */
export function ResponsiveWelcomeVideo({ src }: { src: string }) {
  const [ratio, setRatio] = useState(16 / 9);
  useEffect(() => {
    setRatio(16 / 9);
    const thumbnail = welcomeVideoThumbnail(src);
    if (!thumbnail) return;
    const image = new Image();
    let active = true;
    image.onload = () => {
      if (active && image.naturalWidth > 0 && image.naturalHeight > 0) {
        setRatio(image.naturalWidth / image.naturalHeight);
      }
    };
    image.src = thumbnail;
    return () => { active = false; image.onload = null; };
  }, [src]);

  const directVideo = /\.(mp4|webm|mov)(?:[?#]|$)/i.test(src);
  return (
    <div data-welcome-video-frame style={{ width: '100%', aspectRatio: directVideo ? undefined : ratio,
      borderRadius: 8, overflow: 'hidden', background: '#000',
      boxShadow: '0 14px 28px rgba(0,0,0,.48), 0 4px 8px rgba(0,0,0,.3)' }}>
      {directVideo ? <video src={src} controls playsInline preload="metadata" style={{ display: 'block', width: '100%', height: 'auto' }} /> :
        <iframe src={src} title="Welcome Video" style={{ display: 'block', width: '100%', height: '100%', border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />}
    </div>
  );
}
