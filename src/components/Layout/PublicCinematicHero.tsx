import { PublicCopy } from '@/i18n/PublicCopy';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';
import {
  HOMEPAGE_HERO_VIDEO_READY,
  homepageHeroAsset,
  PUBLIC_HOMEPAGE_VIDEO_FILENAMES,
} from '@/config/publicHeroManifest';
import { PublicHeroPicture } from './PublicPageHero';
import { useHomepageVideo } from './HomepageVideoContext';

export const PublicCinematicHero = () => {
  const control = useHomepageVideo();
  const [videoReady, setVideoReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const showVideo = HOMEPAGE_HERO_VIDEO_READY && !reducedMotion;

  return (
    <section className={`ww-home-cinematic-hero${videoReady ? ' ww-home-video-is-ready' : ''}`} data-solid-text-surface="dark">
      <PublicHeroPicture asset={homepageHeroAsset} />
      {showVideo && (
        <video
          ref={control?.registerVideo}
          className={`ww-home-hero-video${videoReady ? ' is-ready' : ''}`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={homepageHeroAsset.fallback}
          onCanPlay={() => { setVideoReady(true); control?.syncPlayback(); }}
          onError={() => { setVideoReady(false); control?.syncPlayback(); }}
          onPlay={control?.syncPlayback}
          onPlaying={control?.syncPlayback}
          onPause={control?.syncPlayback}
          onEnded={control?.syncPlayback}
          onVolumeChange={control?.syncPlayback}
        >
          <source src={PUBLIC_HOMEPAGE_VIDEO_FILENAMES.mp4} type="video/mp4" />
        </video>
      )}
      <div className="ww-public-hero-shade" aria-hidden="true" />
      <div className="ww-container ww-home-hero-content">
        <p className="ww-eyebrow mb-4"><PublicCopy text={"Everything for the celebration"} /></p>
        <h1 className="ww-display max-w-4xl"><PublicCopy text={"Your all in one wedding planning and guest experience platform"} /></h1>
        <p className="ww-public-hero-lead mt-6 max-w-2xl"><PublicCopy text={"Plan your budget, guests, RSVPs, seating, stationery, event-day details and shared memories in one place."} /></p>
        <div className="mt-8 flex flex-wrap gap-3">
          <AuthGatedCtaLink to="/dashboard" alwaysSignUp className="ww-button-primary ww-focus"><PublicCopy text={"Start Planning Free "} /><ArrowRight size={18} aria-hidden="true" /></AuthGatedCtaLink>
          <Link to="/how-it-works" className="ww-button-hero-secondary ww-focus"><PublicCopy text={"See How It Works"} /></Link>
        </div>
        <p className="ww-public-hero-note mt-4"><PublicCopy text={"7-day free trial · Up to 20 guests · No credit card required"} /></p>
      </div>
    </section>
  );
};
