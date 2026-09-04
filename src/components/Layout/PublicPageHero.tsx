import type { CSSProperties, ReactNode } from 'react';
import type { PublicHeroAsset } from '@/config/publicHeroManifest';

interface PublicPageHeroProps {
  asset: PublicHeroAsset;
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  note?: ReactNode;
  compact?: boolean;
}

const PUBLIC_HERO_WORD_JOINER = /(\p{L})[-‑–](?=\p{L})/gu;

const NATURAL_PUBLIC_HERO_REWRITES: Record<string, string> = {
  'Warum australische Paare 2026 (und darüber hinaus) auf QR-Code-Sitzpläne für Hochzeiten umsteigen':
    'Warum australische Paare 2026 (und darüber hinaus) auf Sitzpläne mit QR Codes für Hochzeiten umsteigen',
  'So erstellen Sie in 5 Minuten einen QR-Code-Sitzplan für die Hochzeit':
    'So erstellen Sie in 5 Minuten einen Sitzplan mit QR Code für die Hochzeit',
  'So bewältigen Sie Last-Minute-Sitzplatzänderungen ohne Stress':
    'So bewältigen Sie kurzfristige Sitzplatzänderungen ohne Stress',
  'Pourquoi les couples australiens passent aux plans de table par QR code en 2026 (et au-delà)':
    'Pourquoi les couples australiens passent aux plans de table par QR code en 2026 (et les années suivantes)',
  'Les plans de table numériques sont-ils faciles pour les invités âgés ? (Guide de mariage)':
    'Plans de table numériques faciles pour les invités âgés : guide de mariage',
  'Waarom Australische stellen in 2026 (en daarna) overstappen op QR-code zitkaarten voor bruiloften':
    'Waarom Australische stellen in 2026 (en daarna) overstappen op zitkaarten met QR codes voor bruiloften',
  'Hoe maak je in 5 minuten een QR-code zitkaart voor je bruiloft':
    'Hoe maak je in 5 minuten een zitkaart met QR code voor je bruiloft',
  'Hoe ga je om met last-minute zitwijzigingen zonder stress':
    'Hoe ga je om met zitwijzigingen op het laatste moment zonder stress',
};

export const normalisePublicHeroHeading = (title: string) =>
  NATURAL_PUBLIC_HERO_REWRITES[title] ?? title.replace(PUBLIC_HERO_WORD_JOINER, '$1 ');

export const PublicHeroPicture = ({ asset }: { asset: PublicHeroAsset }) => (
  <picture className="ww-public-hero-picture" aria-hidden="true">
    {asset.mobileAvif && <source media="(max-width: 639px)" type="image/avif" srcSet={asset.mobileAvif} />}
    {asset.mobileWebp && <source media="(max-width: 639px)" type="image/webp" srcSet={asset.mobileWebp} />}
    {asset.mobileFallback && <source media="(max-width: 639px)" srcSet={asset.mobileFallback} />}
    <source type="image/avif" srcSet={asset.avif} />
    <source type="image/webp" srcSet={asset.webp} />
    <img
      src={asset.fallback}
      alt=""
      width="1672"
      height="940"
      fetchPriority="high"
      decoding="async"
      style={{
        '--ww-hero-position': asset.position ?? 'center center',
        '--ww-hero-mobile-position': asset.mobilePosition ?? asset.position ?? 'center center',
      } as CSSProperties}
    />
  </picture>
);

export const PublicPageHero = ({
  asset,
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  note,
  compact = false,
}: PublicPageHeroProps) => (
  <section className={`ww-public-photo-hero${compact ? ' ww-public-photo-hero-compact' : ''}`} data-solid-text-surface="dark">
    <PublicHeroPicture asset={asset} />
    <div className="ww-public-hero-shade" aria-hidden="true" />
    <div className="ww-container ww-public-hero-content">
      {breadcrumbs}
      <p className="ww-eyebrow mb-4">{eyebrow}</p>
      <h1 className="ww-display max-w-4xl">{normalisePublicHeroHeading(title)}</h1>
      <p className="ww-public-hero-lead mt-6 max-w-2xl">{description}</p>
      {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
      {note && <div className="ww-public-hero-note mt-4">{note}</div>}
    </div>
  </section>
);
