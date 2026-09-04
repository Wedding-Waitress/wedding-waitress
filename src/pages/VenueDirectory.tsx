import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { PublicPageHero } from '@/components/Layout/PublicPageHero';
import { publicHeroForRoute } from '@/config/publicHeroManifest';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, Users, Ruler, Search, Sparkles, Loader2 } from 'lucide-react';
import { useApprovedVenueTemplates, venueTemplateBackgroundUrl } from '@/hooks/useVenueTemplates';

const SITE_URL = 'https://weddingwaitress.com.au';

/**
 * Public Venue Floor Plan Directory.
 * SEO-friendly index of approved venue templates submitted by the community.
 */
export const VenueDirectory = () => {
  const { templates, loading } = useApprovedVenueTemplates();
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<string>('all');
  const [capacityBand, setCapacityBand] = useState<string>('all');

  const countries = useMemo(() => {
    const s = new Set<string>();
    templates.forEach((t) => { if (t.country) s.add(t.country); });
    return Array.from(s).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (country !== 'all' && (t.country ?? '') !== country) return false;
      if (capacityBand !== 'all') {
        const c = t.capacity;
        if (capacityBand === 's' && !(c > 0 && c <= 80)) return false;
        if (capacityBand === 'm' && !(c > 80 && c <= 200)) return false;
        if (capacityBand === 'l' && !(c > 200)) return false;
      }
      if (!q) return true;
      const hay = `${t.venue_name} ${t.room_name} ${t.city ?? ''} ${t.country ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [templates, query, country, capacityBand]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Wedding & Event Venue Floor Plan Directory',
    itemListElement: filtered.slice(0, 50).map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/venues/${t.id}`,
      name: `${t.venue_name} — ${t.room_name}`,
    })),
  };

  return (
    <>
      <Helmet>
        <title>Wedding Venue Floor Plans Directory | Wedding Waitress</title>
        <meta
          name="description"
          content="Browse approved wedding and event venue floor plans. Filter by city, country and guest capacity, then load any layout into your Reception Floor Plan in one click."
        />
        <link rel="canonical" href={`${SITE_URL}/venues`} />
        <meta property="og:title" content="Wedding Venue Floor Plans Directory" />
        <meta property="og:description" content="Approved venue floor plans for weddings and events." />
        <meta property="og:url" content={`${SITE_URL}/venues`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="ww-public min-h-screen bg-background">
        <Header />
        <main>
          <PublicPageHero
            asset={publicHeroForRoute('/venues')}
            eyebrow="Venue directory"
            title="Wedding & Event Venue Floor Plans"
            description="A growing public directory of approved reception layouts. Find the room that matches your venue — then load its exact shape, fixtures and background into Wedding Waitress with one click."
            compact
          />
          <div className="ww-container py-10">
          <div className="flex flex-wrap items-center gap-3 max-lg:flex-col max-lg:items-stretch">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search venues, rooms or cities…"
                className="pl-9 h-11"
              />
            </div>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-11 w-full lg:w-48"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={capacityBand} onValueChange={setCapacityBand}>
              <SelectTrigger className="h-11 w-full lg:w-48"><SelectValue placeholder="Capacity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any capacity</SelectItem>
                <SelectItem value="s">Intimate (up to 80)</SelectItem>
                <SelectItem value="m">Mid-size (81–200)</SelectItem>
                <SelectItem value="l">Large (200+)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading venue directory…
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
                <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No approved venues match your filters yet. Try clearing them, or
                  <Link to="/dashboard?tab=floor-plan" className="text-primary ml-1 underline">
                    submit your own venue
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((t) => {
                  const thumb = venueTemplateBackgroundUrl(t.background_image_path);
                  return (
                    <Link
                      key={t.id}
                      to={`/venues/${t.id}`}
                      className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/60 hover:shadow-md transition-all"
                    >
                      <div className="aspect-[4/3] bg-muted/40 flex items-center justify-center overflow-hidden">
                        {thumb ? (
                          <img src={thumb} alt={`${t.venue_name} ${t.room_name}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                        ) : (
                          <Building2 className="w-12 h-12 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="p-4 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="font-semibold text-foreground truncate">{t.venue_name}</h2>
                            <p className="text-sm text-muted-foreground truncate">{t.room_name}</p>
                          </div>
                          {t.featured && (
                            <Badge variant="secondary" className="shrink-0 gap-1"><Sparkles className="w-3 h-3" /> Featured</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
                          {t.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.city}{t.country ? `, ${t.country}` : ''}</span>}
                          <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {t.capacity}</span>
                          <span className="inline-flex items-center gap-1"><Ruler className="w-3 h-3" /> {t.room_width_m}×{t.room_length_m}m</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        </main>
        <PublicFooter />
      </div>
    </>
  );
};
