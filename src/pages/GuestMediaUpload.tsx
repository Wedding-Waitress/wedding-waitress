// Public guest upload page — /gallery/:token
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGuestMediaUpload } from '@/hooks/useGuestMediaUpload';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, AlertTriangle, X, Heart, Info, Image as ImageIcon, Images, BookOpen, Video, Sparkles, ArrowLeft, ChevronDown } from 'lucide-react';
import { formatBytes, validateFile, ValidationResult, ValidationStage } from '@/lib/mediaValidation';
import { SeoHead } from '@/components/SEO/SeoHead';
import { formatDisplayDate } from '@/lib/utils';
import { GalleryPasswordGate, galleryPasswordKey } from '@/components/Dashboard/PhotoVideoGallery/GalleryPasswordGate';
import { resolveGalleryTheme } from '@/lib/galleryTheme';
import { resolveGalleryTitle } from '@/lib/galleryTitle';
import { GuestBrowseGallery } from '@/components/Dashboard/PhotoVideoGallery/GuestBrowseGallery';
import { GuestGuestbookTab } from '@/components/Dashboard/PhotoVideoGallery/GuestGuestbookTab';
import { GalleryFooterLogo } from '@/components/Dashboard/PhotoVideoGallery/GalleryFooterLogo';
import uploadHeaderLogo from '@/assets/upload-header-logo.png';
import galleryHeaderLogo from '@/assets/gallery-header-logo.png';
import guestbookHeaderLogo from '@/assets/guestbook-header-logo.png';
import photoBoothHeaderLogo from '@/assets/photo-booth-header-logo.png';

// Immersive Digital Photo Booth — reused as-is, opened full screen from the Photo Booth tab.
// The dynamic import retries once before failing so a single flaky chunk request on first
// open no longer forces the guest to refresh the whole page.
import { PhotoBoothBoundary } from '@/components/Dashboard/PhotoVideoGallery/PhotoBoothBoundary';

const importPhotoBooth = () =>
  import('./GuestPhotoBooth').catch(() => new Promise<typeof import('./GuestPhotoBooth')>((resolve, reject) => {
    setTimeout(() => { import('./GuestPhotoBooth').then(resolve, reject); }, 600);
  }));

const GuestPhotoBooth = React.lazy(importPhotoBooth);

/** Default hero background used when the event has no cover image. */
const DEFAULT_HERO_BG = '/default-hero-bg.png';

/** Dark walnut / aged-leather texture used for the hero fallback and the lower page section. */
const LEATHER_STYLE: React.CSSProperties = {
  backgroundColor: '#1C1410',
  backgroundImage: [
    'radial-gradient(80% 60% at 50% 35%, rgba(104, 79, 55, 0.55) 0%, rgba(60, 43, 30, 0) 65%)',
    `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    'repeating-linear-gradient(100deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0.18) 1px, rgba(0,0,0,0) 3px, rgba(255,255,255,0.05) 5px, rgba(0,0,0,0) 8px)',
    'radial-gradient(120% 110% at 50% 50%, rgba(0,0,0,0) 35%, rgba(10, 6, 3, 0.75) 80%, rgba(0,0,0,0.92) 100%)',
    'linear-gradient(180deg, rgba(74, 54, 36, 0.35) 0%, rgba(22, 15, 10, 0.55) 60%, rgba(8, 5, 3, 0.85) 100%)',
  ].join(', '),
  backgroundBlendMode: 'normal, overlay, soft-light, normal, normal',
  backgroundSize: 'cover',
};


interface GalleryPublic {
  gallery_id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  is_open: boolean;
  partner1_name: string | null;
  partner2_name: string | null;
  max_photos: number;
  max_videos: number;
  max_video_bytes: number;
  max_video_duration_sec: number;
  max_photo_bytes: number;
  allowed_photo_mimes: string[];
  allowed_video_mimes: string[];
  gallery_title: string | null;
  welcome_message: string | null;
  show_event_date: boolean;
  password_required: boolean;
  theme_color: string | null;
  background_style: 'light' | 'dark' | 'cream' | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  show_branding: boolean;
  video_guestbook_enabled?: boolean;
  guest_upload_enabled?: boolean;
  gallery_view_enabled?: boolean;
  guestbook_text_enabled?: boolean;
  photo_booth_enabled?: boolean;
}

interface GalleryUsage {
  photos_used: number;
  videos_used: number;
  bytes_used: number;
  max_photos: number;
  max_videos: number;
  max_total_bytes: number;
}

export const GuestMediaUpload: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [gallery, setGallery] = useState<GalleryPublic | null>(null);
  const [usage, setUsage] = useState<GalleryUsage | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'guestbook' | 'booth'>('upload');
  // Tab explicitly requested via a saved direct link (?tab=…), used to explain disabled features.
  const [requestedTab, setRequestedTab] = useState<'upload' | 'gallery' | 'guestbook' | 'booth' | null>(null);
  // Gallery refresh trigger for the browse tab.
  const [galleryRefresh, setGalleryRefresh] = useState(0);

  const [items, setItems] = useState<ValidationResult[]>([]);
  const [stages, setStages] = useState<Record<number, ValidationStage>>({});
  const [validating, setValidating] = useState(false);
  const [awaitingPicker, setAwaitingPicker] = useState(false);
  const [pickerHint, setPickerHint] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [showThanks, setShowThanks] = useState(false);
  const [thanksSummary, setThanksSummary] = useState<{ success: number; failures: { name: string; reason: string }[] } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pickerTimer = useRef<number | null>(null);
  const { uploadFiles, progress, uploading, reset } = useGuestMediaUpload();

  const nameStorageKey = token ? `gallery-uploader-name:${token}` : '';

  useEffect(() => {
    if (!token) return;
    try {
      if (sessionStorage.getItem(galleryPasswordKey(token))) setUnlocked(true);
      const savedName = sessionStorage.getItem(nameStorageKey);
      if (savedName) setName(savedName);
      // ?tab=gallery / ?tab=guestbook always wins; otherwise default to Upload.
      const urlTab = new URLSearchParams(window.location.search).get('tab');
      if (urlTab === 'gallery' || urlTab === 'guestbook' || urlTab === 'upload' || urlTab === 'booth') {
        setRequestedTab(urlTab);
        setActiveTab(urlTab);
      } else if (sessionStorage.getItem(`gallery-has-uploaded:${token}`)) {
        setActiveTab('gallery');
      }
    } catch {}
  }, [token, nameStorageKey]);

  useEffect(() => {
    if (!nameStorageKey) return;
    try {
      if (name.trim()) sessionStorage.setItem(nameStorageKey, name.trim());
    } catch {}
  }, [name, nameStorageKey]);

  const loadUsage = useCallback(async () => {
    if (!token) return;
    const { data } = await (supabase as any).rpc('get_event_media_gallery_usage_public', { _token: token });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setUsage(row as GalleryUsage);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const [{ data }] = await Promise.all([
        (supabase as any).rpc('get_event_media_gallery_public', { _token: token }),
        loadUsage(),
      ]);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) setNotFound(true);
      else setGallery(row as GalleryPublic);
      setLoading(false);
    })();
  }, [token, loadUsage]);

  // Refresh usage after uploads finish so the gate reflects newly added files.
  useEffect(() => {
    if (!uploading && progress.length > 0 && progress.some(p => p.status === 'done')) {
      loadUsage();
    }
  }, [uploading, progress, loadUsage]);

  const openPicker = useCallback(() => {
    setPickerHint(null);
    setAwaitingPicker(true);
    if (pickerTimer.current) window.clearTimeout(pickerTimer.current);
    // If no onChange fires within 30s after picker open, hint that iPhone may still be preparing.
    pickerTimer.current = window.setTimeout(() => {
      setPickerHint('Your iPhone may still be preparing the video. Please wait, or choose a smaller/local video.');
      setAwaitingPicker(false);
    }, 30000);
    fileInput.current?.click();
  }, []);

  const onFiles = useCallback(async (picked: FileList | null) => {
    if (pickerTimer.current) { window.clearTimeout(pickerTimer.current); pickerTimer.current = null; }
    setAwaitingPicker(false);
    if (!gallery) return;
    if (!picked || picked.length === 0) {
      setPickerHint('Your iPhone may still be preparing the video. Please wait, or choose a smaller/local video.');
      return;
    }
    setPickerHint(null);
    setValidating(true);
    const arr = Array.from(picked);
    const startIndex = items.length;
    // Insert placeholders immediately so the user sees activity.
    const placeholders: ValidationResult[] = arr.map(f => ({
      file: f, fileName: f.name, kind: null, mime: f.type || '',
      mimeInferred: !f.type, size: f.size, duration: null,
      durationUnknown: false, ok: true,
    }));
    setItems(prev => [...prev, ...placeholders]);
    setStages(prev => {
      const next = { ...prev };
      arr.forEach((_, i) => { next[startIndex + i] = 'preparing'; });
      return next;
    });

    for (let i = 0; i < arr.length; i++) {
      const idx = startIndex + i;
      let result: ValidationResult;
      try {
        result = await validateFile(arr[i], gallery, (s) => {
          setStages(prev => ({ ...prev, [idx]: s }));
        });
      } catch {
        result = {
          file: arr[i], fileName: arr[i].name, kind: null, mime: arr[i].type || '',
          mimeInferred: !arr[i].type, size: arr[i].size, duration: null,
          durationUnknown: false, ok: false,
          reason: 'file_unreadable', reasonText: 'File could not be loaded from device/iCloud',
        };
      }
      setItems(prev => prev.map((it, j) => j === idx ? result : it));
      setStages(prev => ({ ...prev, [idx]: 'ready' }));
    }
    setValidating(false);
    if (fileInput.current) fileInput.current.value = '';
  }, [gallery, items.length]);

  const removeItem = (i: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== i));
    setStages(prev => { const n = { ...prev }; delete n[i]; return n; });
  };

  const onSubmit = async () => {
    if (!gallery || !token || items.length === 0) return;
    await uploadFiles(items, {
      token,
      uploaderName: name.trim(),
      caption: '',
      guestbookMessage: '',
      limits: gallery,
    });
  };

  useEffect(() => {
    if (!uploading && progress.length > 0 && progress.every(p => p.status === 'done' || p.status === 'error' || p.status === 'skipped')) {
      const anySuccess = progress.some(p => p.status === 'done');
      if (anySuccess) {
        const success = progress.filter(p => p.status === 'done').length;
        const failures = progress
          .filter(p => p.status === 'error' || p.status === 'skipped')
          .map(p => ({ name: p.fileName, reason: p.error || 'Could not be uploaded' }));
        setThanksSummary({ success, failures });
        setShowThanks(true);
        // Guests land on the browse gallery once they've shared something.
        setActiveTab('gallery');
        setGalleryRefresh(n => n + 1);
        try { if (token) sessionStorage.setItem(`gallery-has-uploaded:${token}`, '1'); } catch {}

      }
    }
  }, [uploading, progress, token]);

  const handleShareMore = () => {
    setActiveTab('upload');
    setShowThanks(false);

    setThanksSummary(null);
    setItems([]);
    setStages({});
    reset();
  };

  const handleBackToStart = () => {
    handleShareMore();
    setName('');
    try { if (nameStorageKey) sessionStorage.removeItem(nameStorageKey); } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const theme = resolveGalleryTheme(gallery);
  const accent = theme.themeColor;
  const accentHover = theme.themeColorHover;
  const accentSoftBg = `${accent}1A`;
  // Lower page section always sits on the dark leather texture -> force light text.
  const lowerTheme = { ...theme, isDark: true, textClass: 'text-white', mutedClass: 'text-white', borderClass: 'border-white/15' };


  if (loading) {
    return <div className={`min-h-screen flex items-center justify-center ${theme.bgClass}`} style={theme.pageStyle}><Loader2 className="animate-spin h-8 w-8" style={{ color: accent }} /></div>;
  }
  if (notFound || !gallery) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${theme.bgClass}`} style={theme.pageStyle}>
        <Card className={`p-8 max-w-md text-center ${theme.surfaceClass} ${theme.textClass}`}>
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-xl font-semibold mb-2">Gallery link not found</h1>
          <p className={`text-sm ${theme.mutedClass}`}>This upload link is invalid or has been closed by the host.</p>
        </Card>
      </div>
    );
  }
  if (gallery.password_required && !unlocked && token) {
    return (
      <GalleryPasswordGate
        token={token}
        title={`${gallery.event_name} — password required`}
        onVerified={() => setUnlocked(true)}
        theme={theme}
      />
    );
  }
  if (!gallery.is_open) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${theme.bgClass}`} style={theme.pageStyle}>
        <Card className={`p-8 max-w-md text-center ${theme.surfaceClass} ${theme.textClass}`}>
          <Camera className="h-12 w-12 mx-auto mb-4" style={{ color: accent }} />
          <h1 className="text-xl font-semibold mb-2">{gallery.event_name}</h1>
          <p className={`text-sm ${theme.mutedClass}`}>The host has closed uploads for this gallery.</p>
        </Card>
      </div>
    );
  }

  const displayTitle = resolveGalleryTitle(gallery);
  // Couple names must always follow the current event. Prefer the event/gallery title
  // (e.g. "Jason & Linda's Wedding" -> "Jason & Linda"), fall back to stored partner names.
  const titleCouple = (() => {
    const t = (gallery.event_name || displayTitle || '').trim();
    if (!t) return '';
    const stripped = t.replace(/[''`]s\s+.*$/i, '').trim();
    return stripped.includes('&') || stripped.toLowerCase().includes(' and ') ? stripped : '';
  })();
  const couple = titleCouple || [gallery.partner1_name, gallery.partner2_name].filter(Boolean).join(' & ');

  const displayWelcome = gallery.welcome_message?.trim() || 'Share your favourite photos and videos from today.';
  const showDate = gallery.show_event_date !== false && !!gallery.event_date;

  if (showThanks) {
    const summary = thanksSummary ?? { success: 0, failures: [] };
    const { success, failures } = summary;
    const firstName = name.trim().split(/\s+/)[0];
    const greeting = firstName ? `Thank you, ${firstName}!` : 'Thank you!';
    const fileWord = (n: number) => (n === 1 ? 'file' : 'files');
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10 overflow-x-hidden" style={LEATHER_STYLE}>
        <SeoHead title={`${gallery.event_name} — Thank you for sharing`} description="Your memories have been shared with the couple." />
        <Card className={`p-7 sm:p-8 max-w-md w-full text-center backdrop-blur-sm ${theme.isDark ? 'bg-white/5 border-white/10' : 'bg-white/90 border-[#E8E1D6]'} ${theme.textClass}`}>
          {theme.logoImageUrl && (
            <img src={theme.logoImageUrl} alt="" className="mx-auto max-h-12 mb-4 object-contain" />
          )}
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute inset-0 -m-3 rounded-full blur-xl" aria-hidden="true" style={{ backgroundColor: accentSoftBg }} />
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center border ${theme.isDark ? 'bg-white/10 border-white/20' : 'bg-gradient-to-br from-[#F4EEE4] to-[#E8D9BF] border-[#E8E1D6]'}`}>
              <Heart className="h-10 w-10" style={{ color: accent }} fill={accent} />
              <Sparkles className="absolute -top-1 -right-1 h-5 w-5" style={{ color: accent }} />
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
          <p className={`text-base mt-3 leading-relaxed ${theme.mutedClass}`}>
            {success > 0
              ? <>You just shared <span className={`font-medium ${theme.textClass}`}>{success} {fileWord(success)}</span> with {couple || 'the couple'}. These memories mean the world. 💛</>
              : <>Your message has been received by {couple || 'the couple'}.</>}
          </p>

          {success > 0 && (
            <div className={`mt-5 rounded-xl border-2 p-3.5 flex items-center justify-center gap-2 text-sm ${theme.isDark ? 'border-white/15 bg-white/5 text-white/80' : 'border-[#967A59] bg-[#FBF7EE] text-[#7A5E3A]'}`}>
              <CheckCircle2 className="h-4 w-4 text-[#6B8E5A]" />
              <span><span className="font-semibold">{success}</span> {fileWord(success)} uploaded successfully</span>
            </div>
          )}

          {failures.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-left">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                {failures.length} {fileWord(failures.length)} couldn't be shared
              </div>
              <ul className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                {failures.map((f, i) => (
                  <li key={i} className="text-xs text-amber-900/90">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="text-amber-800/80">{f.reason}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 space-y-2.5">
            <Button
              className="lv-premium-shade w-full h-12 text-white text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all bg-green-500 hover:bg-green-600"
              onClick={handleShareMore}
            >
              <Camera className="h-4 w-4 mr-2" />
              Share more photos &amp; videos
            </Button>
            <Button
              type="button"
              variant="outline"
              className="lv-premium-shade w-full h-12 text-base border-2 border-[#967A59]"

              onClick={handleBackToStart}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to start
            </Button>
          </div>

          <p className={`mt-5 text-xs italic ${theme.mutedClass}`}>
            With love from {couple || displayTitle} 🤍
          </p>
          {theme.showBranding && <GalleryFooterLogo className="mt-3" tone="brown" />}
        </Card>
      </div>
    );
  }


  const validCount = items.filter(i => i.ok).length;

  const heroBg = theme.coverImageUrl;
  const heroBackdrop = heroBg || DEFAULT_HERO_BG;
  const scrollToExplore = () => {
    document.getElementById('gallery-explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const scrollToTabSection = () => {
    const el = document.getElementById('guest-tab-section') || document.getElementById('gallery-explore');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // Effective tab (mirrors the availability logic used for the tab bar below)
  const availableTabs = ([
    gallery.guest_upload_enabled !== false ? 'upload' : null,
    gallery.gallery_view_enabled !== false ? 'gallery' : null,
    (gallery.guestbook_text_enabled !== false || !!gallery.video_guestbook_enabled) ? 'guestbook' : null,
    gallery.photo_booth_enabled ? 'booth' : null,
  ].filter(Boolean)) as Array<'upload' | 'gallery' | 'guestbook' | 'booth'>;
  const heroTab = availableTabs.includes(activeTab) ? activeTab : (availableTabs[0] ?? 'upload');
  const heroButtonLabel =
    heroTab === 'gallery' ? 'View Photo and Video Gallery'
      : heroTab === 'guestbook' ? 'Leave Your Message'
        : heroTab === 'booth' ? 'Start the Photo Booth Fun'
          : 'Upload Photos & Videos';

  return (
    <div className={`min-h-screen overflow-x-hidden ${theme.bgClass} ${theme.textClass}`} style={theme.pageStyle}>
      <SeoHead title={`${gallery.event_name} — Share your photos & videos`} description="Upload photos and short videos to the wedding gallery." />

      {/* ---------- HERO ---------- */}
      <header className="relative min-h-[100svh] flex flex-col items-center justify-center px-5 py-16 text-center overflow-hidden">
        <div
          className={`absolute inset-0 bg-center bg-cover ${heroBg ? 'scale-110 blur-[18px]' : ''}`}
          style={{ backgroundImage: `url(${heroBackdrop})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" aria-hidden="true" />


        <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center">
          {/* Circular event avatar */}
          <div
            className={[
              "w-[80vw] h-[80vw] sm:w-[320px] sm:h-[320px] md:w-[400px] md:h-[400px] lg:w-[460px] lg:h-[460px] max-w-[520px] max-h-[520px] rounded-full overflow-hidden flex items-center justify-center",
              (activeTab !== 'upload' && activeTab !== 'gallery' && activeTab !== 'guestbook' && activeTab !== 'booth') ? "border-[3px] shadow-2xl bg-white/10 backdrop-blur-sm" : ""
            ].join(' ')}
            style={(activeTab !== 'upload' && activeTab !== 'gallery' && activeTab !== 'guestbook' && activeTab !== 'booth') ? { borderColor: accent } : undefined}
          >
            {activeTab === 'guestbook' ? (
              <img
                src={guestbookHeaderLogo}
                alt="Please Sign Our Guest Book"
                className="w-full h-full object-contain object-center block"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                }}
              />
            ) : activeTab === 'booth' ? (
              <img
                src={photoBoothHeaderLogo}
                alt="Photo Booth"
                className="w-full h-full object-contain object-center block"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                }}
              />
            ) : heroBg ? (
              <img src={heroBg} alt="" className="w-full h-full object-cover" />
            ) : activeTab === 'upload' ? (
              <img
                src={uploadHeaderLogo}
                alt="Create and Share the Memories"
                className="w-full h-full object-contain object-center block"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                }}
              />
            ) : activeTab === 'gallery' ? (
              <img
                src={galleryHeaderLogo}
                alt="See Tonight Through Your Guests' Eyes"
                className="w-full h-full object-contain object-center block"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                }}
              />
            ) : theme.logoImageUrl ? (
              <img src={theme.logoImageUrl} alt="" className="w-full h-full object-contain p-3" />
            ) : (
              <img src={DEFAULT_HERO_BG} alt="" className="w-full h-full object-cover" />
            )}
          </div>

          {showDate && (
            <span
              className="mt-6 inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-white/85 backdrop-blur-sm"
            >
              {(() => {
                const d = new Date(gallery.event_date);
                return isNaN(d.getTime())
                  ? formatDisplayDate(gallery.event_date)
                  : `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'long' })} ${d.getFullYear()}`;
              })()}
            </span>
          )}

          <h1 className="mt-5 text-4xl sm:text-6xl font-semibold leading-[1.1] tracking-tight text-white">
            {displayTitle}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-white/80 max-w-md leading-relaxed">
            Help us capture every memory from today
          </p>

          <Button
            type="button"
            onClick={scrollToTabSection}
            className="lv-premium-shade mt-5 h-14 px-8 rounded-full text-white text-base font-semibold shadow-xl"
            style={{ backgroundColor: accent }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = accentHover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = accent; }}
          >
            <Upload className="h-5 w-5 mr-2" />
            {heroButtonLabel}
          </Button>
        </div>

        <button
          type="button"
          onClick={scrollToExplore}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-white/75 hover:text-white transition-colors"
          aria-label="Scroll to explore"
        >
          <span className="text-[10px] uppercase tracking-[0.35em]">Explore</span>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </button>
      </header>

      {/* ---------- TABS + CONTENT ---------- */}
      <div id="gallery-explore" className="px-4 py-10 scroll-mt-4 min-h-screen" style={{ backgroundColor: '#000000' }}>
      {(() => {
        const uploadOn = gallery.guest_upload_enabled !== false;
        const galleryOn = gallery.gallery_view_enabled !== false;
        const textOn = gallery.guestbook_text_enabled !== false;
        const voiceOn = !!gallery.video_guestbook_enabled;
        const boothOn = !!gallery.photo_booth_enabled;
        const guestbookOn = textOn || voiceOn;
        type TabKey = 'upload' | 'gallery' | 'booth' | 'guestbook';
        const tabs = ([
          uploadOn ? 'upload' : null,
          galleryOn ? 'gallery' : null,
          guestbookOn ? 'guestbook' : null,
          boothOn ? 'booth' : null,
        ].filter(Boolean)) as TabKey[];
        const labels: Record<TabKey, string> = {
          upload: 'Upload',
          gallery: 'Gallery',
          booth: 'Photo Booth',
          guestbook: 'Guestbook',
        };

        const current = ((tabs as string[]).includes(activeTab) ? activeTab : (tabs[0] ?? null)) as TabKey | null;
        if (!current) {
          return (
            <div className="max-w-md mx-auto py-20 text-center">
              <div className="rounded-2xl border border-white/20 bg-white/[0.06] px-6 py-10 backdrop-blur-sm">
                <Heart className="h-10 w-10 mx-auto mb-4" style={{ color: accent }} />
                <h2 className="text-xl font-semibold text-white">This event experience is currently unavailable</h2>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">
                  The hosts have turned off guest features for now. Please check back a little later.
                </p>
              </div>
            </div>
          );
        }
        const unavailableRequest = requestedTab && !(tabs as string[]).includes(requestedTab)
          ? requestedTab === 'upload' ? 'Uploading photos and videos is'
            : requestedTab === 'gallery' ? 'The guest gallery is'
            : requestedTab === 'booth' ? 'The Digital Photo Booth is'
            : 'The guestbook is'
          : null;
        return (
      <div className={`${current === 'upload' ? 'max-w-md' : 'max-w-5xl'} mx-auto`}>
        {unavailableRequest && (
          <div className="mb-6 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-center">
            <p className="text-sm text-white break-words">{unavailableRequest} currently unavailable for this event.</p>
          </div>
        )}
        {tabs.length > 1 && (
        <div className="mb-6 flex flex-nowrap w-full gap-1 rounded-full p-1 bg-black border border-white/25 overflow-hidden">

          {tabs.map(tab => {
            const active = current === tab;
            const TabIcon = tab === 'upload' ? Upload : tab === 'gallery' ? Images : tab === 'guestbook' ? BookOpen : Camera;
            const cls = `flex-1 basis-0 min-w-0 min-h-[56px] py-2 flex flex-col items-center justify-center gap-1 text-center rounded-full font-medium transition-colors duration-150 px-1 sm:px-3 text-[11px] sm:text-sm whitespace-nowrap leading-none ${active ? 'text-[#1C1410] bg-[#E8CFA3] shadow-md' : 'text-white/80 hover:text-white'}`;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cls}
              >
                <TabIcon className="h-[21px] w-[21px] shrink-0" strokeWidth={2} aria-hidden="true" />
                <span className="truncate">{labels[tab]}</span>
              </button>
            );
          })}
        </div>
        )}

        <div id="guest-tab-section" className="scroll-mt-24" />


        {current === 'upload' && (
          <p className="text-center text-base mb-6 leading-relaxed whitespace-pre-line text-white">
            {displayWelcome}
          </p>
        )}


        {current === 'gallery' && token && (
          <GuestBrowseGallery token={token} theme={lowerTheme} accent={accent} refreshKey={galleryRefresh} eventName={gallery.event_name} />
        )}

        {current === 'booth' && token && (
          <PhotoBoothBoundary accent={accent}>
            <GuestPhotoBooth tokenProp={token} embedded onSaved={() => setGalleryRefresh(n => n + 1)} />
          </PhotoBoothBoundary>
        )}


        {current === 'guestbook' && token && (
          <GuestGuestbookTab token={token} theme={lowerTheme} accent={accent} refreshKey={galleryRefresh} voiceEnabled={voiceOn} textEnabled={textOn} />
        )}



        {current === 'upload' && (
        <Card className="p-6 sm:p-7 space-y-7 border-2 border-[#967A59] shadow-[0_8px_30px_rgba(150,122,89,0.10)] bg-white/95">

          <div className="space-y-3">
            <Label htmlFor="g-name" className="text-lg font-bold text-[#1D1D1F] block">
              Your full name <span className="text-red-500" aria-hidden="true">*</span>
            </Label>
            <p className="text-sm text-[#6E6E73]">So the couple knows who shared these memories</p>
            <Input id="g-name" className="h-14 text-base mt-1 border-[#967A59]/50 focus:border-[#967A59] focus:ring-[#967A59]/20 rounded-xl px-4" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" />
          </div>

          {(() => {
            const photosFull = !!usage && usage.photos_used >= usage.max_photos;
            const videosFull = !!usage && usage.videos_used >= usage.max_videos;
            const storageFull = !!usage && usage.bytes_used >= usage.max_total_bytes;
            const anyFull = photosFull || videosFull || storageFull;
            const fullParts: string[] = [];
            if (photosFull) fullParts.push('photos');
            if (videosFull) fullParts.push('videos');
            if (storageFull) fullParts.push('storage');
            return (
          <div className="space-y-3">
            <Label className="text-lg font-bold text-[#1D1D1F] block">Upload Photos and Videos</Label>

            <div className="mt-1 mb-4 bg-[#FBF7F0] rounded-xl p-4 border border-[#E8E1D6] space-y-2.5">
              <p className="text-sm font-semibold text-[#1D1D1F]">Upload limits</p>
              <div className="flex items-start gap-2 text-sm text-[#6E6E73]">
                <ImageIcon className="h-4 w-4 text-[#967A59] mt-0.5 shrink-0" />
                <span>Photos: JPG, PNG, WebP up to {formatBytes(gallery.max_photo_bytes)}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-[#6E6E73]">
                <Video className="h-4 w-4 text-[#967A59] mt-0.5 shrink-0" />
                <span>Videos: MP4, MOV up to {formatBytes(gallery.max_video_bytes)} and {Math.floor(gallery.max_video_duration_sec / 60)} minutes</span>
              </div>
            </div>

            {anyFull && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">The gallery is full</div>
                  <div className="text-xs mt-0.5">
                    The {fullParts.join(' and ')} limit has been reached. Please check back later — the hosts may make more room soon. Thanks for wanting to share!
                  </div>
                </div>
              </div>
            )}

            <input
              ref={fileInput}
              type="file"
              multiple
              accept={[...gallery.allowed_photo_mimes, ...gallery.allowed_video_mimes, '.mov', '.mp4', '.m4v'].join(',')}
              className="hidden"
              onChange={e => onFiles(e.target.files)}
            />
            <Button
              type="button"
              className="lv-premium-shade w-full h-14 text-white text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all bg-green-500 hover:bg-green-600"
              onClick={openPicker}
              disabled={uploading || validating || awaitingPicker || anyFull}
            >
              {awaitingPicker
                ? <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Waiting for picker…</>
                : validating
                  ? <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Preparing selected files…</>
                  : anyFull
                    ? <><AlertCircle className="h-5 w-5 mr-2" /> Gallery full</>
                    : <><Upload className="h-5 w-5 mr-2" /> Choose files</>}
            </Button>

            {(awaitingPicker || validating) && (
              <div className="mt-2 text-sm text-[#6E6E73] flex items-center gap-1.5">
                <Loader2 className="animate-spin h-3.5 w-3.5" />
                {awaitingPicker ? 'Waiting for your selection…' : 'Preparing selected files…'}
              </div>
            )}

            {pickerHint && (
              <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{pickerHint}</span>
              </div>
            )}

            {items.length > 0 && (
              <ul className="mt-4 space-y-2.5">
                {items.map((it, i) => {
                  const p = progress[i];
                  const status = p?.status;
                  const stage = stages[i];
                  const errMsg = p?.error || it.reasonText;
                  const isVideo = it.kind === 'video' || /\.(mov|mp4|m4v|qt)$/i.test(it.fileName);
                  const stillValidating = stage && stage !== 'ready';
                  const durationText =
                    it.kind === 'video'
                      ? (it.durationUnknown ? 'duration unknown' : `${it.duration ?? '?'}s`)
                      : null;
                  return (
                    <li key={i} className="text-sm border border-[#E8E1D6] rounded-xl p-3 bg-white">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{it.fileName}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                            {it.mime || 'unknown type'}{it.mimeInferred && it.mime ? ' (inferred)' : ''} • {formatBytes(it.size)}
                            {durationText ? ` • ${durationText}` : ''}
                          </div>
                        </div>
                        {!uploading && status !== 'done' && !stillValidating && (
                          <button
                            type="button"
                            aria-label="Remove"
                            onClick={() => removeItem(i)}
                            className="text-muted-foreground hover:text-foreground p-1 -m-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Validation / progress badge */}
                      <div className="mt-1.5">
                        {stillValidating ? (
                          <span className="text-xs text-[#967A59] flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {isVideo
                              ? (stage === 'preparing' ? 'Preparing file…' : 'Checking video…')
                              : 'Preparing file…'}
                          </span>
                        ) : !it.ok ? (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {it.reasonText}
                          </span>
                        ) : status === 'error' ? (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {errMsg}
                          </span>
                        ) : status === 'done' ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Uploaded
                          </span>
                        ) : status === 'uploading' ? (
                          <div>
                            <div className="text-[11px] text-[#6E6E73] mb-1">Uploading {p?.percent ?? 0}%</div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-[#967A59] transition-all" style={{ width: `${p?.percent ?? 0}%` }} />
                            </div>
                          </div>
                        ) : it.durationUnknown ? (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Duration unknown — will still upload
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Ready to upload
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
            );
          })()}


          <div className="pt-1">
            <Button
              className="lv-premium-shade w-full h-14 text-white text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
              style={{ backgroundColor: accent }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = accentHover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = accent; }}
              disabled={uploading || validating || validCount === 0 || !name.trim()}
              onClick={onSubmit}
            >
              {uploading
                ? (<><Loader2 className="animate-spin h-5 w-5 mr-2" /> Uploading…</>)
                : `Share ${validCount || ''} file${validCount === 1 ? '' : 's'}`}
            </Button>

            {!uploading && !validating && (
              <div className={`mt-3 text-sm text-center min-h-[1.25rem] ${theme.mutedClass}`}>
                {!name.trim() && items.length > 0
                  ? 'Enter your full name above to share these memories'
                  : name.trim() && validCount === 0 && items.length > 0
                    ? 'Remove invalid files or choose new ones to share'
                    : name.trim() && items.length === 0
                      ? 'Choose at least one photo or video to share'
                      : ''}
              </div>
            )}
          </div>
        </Card>
        )}

        {theme.showBranding && <GalleryFooterLogo className="mt-6" />}

      </div>
        );
      })()}
      </div>

    </div>
  );
};

export default GuestMediaUpload;
