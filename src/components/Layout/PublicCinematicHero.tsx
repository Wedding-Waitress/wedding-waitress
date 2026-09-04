import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';
import {
  HOMEPAGE_HERO_VIDEO_READY,
  homepageHeroAsset,
  PUBLIC_HOMEPAGE_VIDEO_FILENAMES,
} from '@/config/publicHeroManifest';
import { PublicHeroPicture } from './PublicPageHero';

export const PublicCinematicHero = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  const showVideo = HOMEPAGE_HERO_VIDEO_READY && !reducedMotion;

  return (
    <section className={`ww-home-cinematic-hero${videoReady ? ' ww-home-video-is-ready' : ''}`} data-solid-text-surface="dark">
      <PublicHeroPicture asset={homepageHeroAsset} />
      {showVideo && (
        <video
          ref={videoRef}
          className={`ww-home-hero-video${videoReady ? ' is-ready' : ''}`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={homepageHeroAsset.fallback}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoReady(false)}
        >
          <source media="(max-width: 639px)" src={PUBLIC_HOMEPAGE_VIDEO_FILENAMES.mobileWebm} type="video/webm" />
          <source media="(max-width: 639px)" src={PUBLIC_HOMEPAGE_VIDEO_FILENAMES.mobileMp4} type="video/mp4" />
          <source src={PUBLIC_HOMEPAGE_VIDEO_FILENAMES.desktopWebm} type="video/webm" />
          <source src={PUBLIC_HOMEPAGE_VIDEO_FILENAMES.desktopMp4} type="video/mp4" />
        </video>
      )}
      <div className="ww-public-hero-shade" aria-hidden="true" />
      <div className="ww-container ww-home-hero-content">
        <p className="ww-eyebrow mb-4">Everything for the celebration</p>
        <h1 className="ww-display max-w-4xl">Your all in one wedding planning and guest experience platform</h1>
        <p className="ww-public-hero-lead mt-6 max-w-2xl">Manage guests, RSVPs, seating, invitations, signage, event-day planning and shared memories in one connected place.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <AuthGatedCtaLink to="/dashboard" alwaysSignUp className="ww-button-primary ww-focus">Start Planning Free <ArrowRight size={18} aria-hidden="true" /></AuthGatedCtaLink>
          <Link to="/how-it-works" className="ww-button-hero-secondary ww-focus">See How It Works</Link>
        </div>
        <p className="ww-public-hero-note mt-4">7-day free trial · Up to 20 guests · No credit card required</p>
      </div>
      {showVideo && videoReady && (
        <button type="button" className="ww-home-video-toggle ww-focus" onClick={togglePlayback} aria-label={paused ? 'Play hero video' : 'Pause hero video'}>
          {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
          <span>{paused ? 'Play' : 'Pause'}</span>
        </button>
      )}
    </section>
  );
};
