import React, { useEffect, useRef, useState } from 'react';
import { hasLoadedSignageImage, rememberSignageImage } from '@/lib/signageImageCache';
import { Loader2 } from 'lucide-react';
const visibilityCallbacks = new WeakMap<Element, () => void>();
let visibilityObserver: IntersectionObserver | undefined;
function observeVisibility(element: Element, visible: () => void) {
  if (typeof IntersectionObserver === 'undefined') return () => undefined;
  visibilityObserver ??= new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { visibilityCallbacks.get(entry.target)?.(); visibilityObserver!.unobserve(entry.target); }
    });
  }, { rootMargin: '100px' });
  visibilityCallbacks.set(element, visible);
  visibilityObserver.observe(element);
  return () => { visibilityObserver?.unobserve(element); visibilityCallbacks.delete(element); };
}
// Key this component by the chosen URL so old load events cannot mark a newer
// image ready. Browser caching supplies the bytes; this cache supplies readiness.
export function SignageLibraryImage({ src, fallback, placeholder, alt, className, eager = false }: {
  src: string; fallback: string; placeholder?: string | null; alt: string; className: string; eager?: boolean;
}) {
  const [source, setSource] = useState(src);
  const [loaded, setLoaded] = useState(hasLoadedSignageImage(src));
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(eager);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (eager || !imageRef.current) return;
    return observeVisibility(imageRef.current, () => setVisible(true));
  }, [eager]);
  return <>
    {!loaded && placeholder && <img src={placeholder} alt="" aria-hidden="true" className={`${className} absolute inset-0`} decoding="async" />}
    <img ref={imageRef} src={source} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={className}
      onLoad={event => { rememberSignageImage(source, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight); setLoaded(true); }}
      onError={() => {
        if (source !== fallback) { setSource(fallback); setLoaded(hasLoadedSignageImage(fallback)); }
        else setFailed(true);
      }} />
    {!loaded && visible && <span role={failed ? 'alert' : 'status'} className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-xs p-2">
      {failed ? <button type="button" className="underline" onClick={() => { setFailed(false); setSource(''); requestAnimationFrame(() => setSource(src)); }}>Image could not load. Try again</button>
        : <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading image...</>}
    </span>}
  </>;
}
