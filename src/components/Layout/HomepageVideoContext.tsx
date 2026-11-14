import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface HomepageVideoControl {
  registerVideo: (video: HTMLVideoElement | null) => void;
  syncPlayback: () => void;
  toggleSound: () => Promise<void>;
  canPlay: boolean;
  audible: boolean;
  pending: boolean;
}

const HomepageVideoContext = createContext<HomepageVideoControl | null>(null);
export const useHomepageVideo = () => useContext(HomepageVideoContext);

export const HomepageVideoProvider = ({ children }: { children: ReactNode }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [canPlay, setCanPlay] = useState(false);
  const [audible, setAudible] = useState(false);
  const [pending, setPending] = useState(false);

  const syncPlayback = useCallback(() => {
    const video = videoRef.current;
    setCanPlay(Boolean(video && video.readyState >= 2 && !video.error));
    setAudible(Boolean(video && !video.muted && video.volume > 0 && !video.paused && !video.ended && !video.error));
  }, []);

  const registerVideo = useCallback((video: HTMLVideoElement | null) => {
    const previous = videoRef.current;
    if (previous && previous !== video) {
      previous.muted = true;
      previous.pause();
    }
    videoRef.current = video;
    if (video) {
      // Every new homepage visit starts silent; sound requires a fresh gesture.
      video.defaultMuted = true;
      video.muted = true;
      video.loop = true;
    }
    syncPlayback();
  }, [syncPlayback]);

  const toggleSound = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.error) return;
    if (!video.muted && !video.paused && video.volume > 0) {
      video.muted = true;
      syncPlayback();
      return;
    }
    setPending(true);
    try {
      video.muted = false;
      if (video.volume === 0) video.volume = 1;
      await video.play();
      // Do not show sound as on when the browser denies playback.
      if (video.paused || video.error) video.muted = true;
    } catch {
      video.muted = true;
    } finally {
      syncPlayback();
      setPending(false);
    }
  }, [syncPlayback]);

  return <HomepageVideoContext.Provider value={{ registerVideo, syncPlayback, toggleSound, canPlay, audible, pending }}>{children}</HomepageVideoContext.Provider>;
};
