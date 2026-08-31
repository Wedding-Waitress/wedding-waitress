import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Users, Ruler, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { venueTemplateBackgroundUrl, type VenueTemplate } from '@/hooks/useVenueTemplates';

const SITE_URL = 'https://weddingwaitress.com.au';

export const VenueDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate] = useState<VenueTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from('venue_floor_plan_templates')
        .select('*')
        .eq('id', id)
        .eq('approved', true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setTemplate(data as VenueTemplate);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="ww-public min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading venue…
        </div>
      </div>
    );
  }

  if (notFound || !template) {
    return (
      <div className="ww-public min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground">Venue not found</h1>
          <p className="text-muted-foreground mt-2">This venue template is not approved or doesn't exist.</p>
          <Link to="/venues" className="inline-block mt-6">
            <Button variant="outline" className="lv-premium-shade"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to directory</Button>
          </Link>
        </div>
      </div>
    );
  }

  const thumb = venueTemplateBackgroundUrl(template.background_image_path);
  const title = `${template.venue_name} — ${template.room_name} Floor Plan`;
  const description = `${template.venue_name} ${template.room_name}${template.city ? ` in ${template.city}${template.country ? `, ${template.country}` : ''}` : ''}. Capacity ${template.capacity} guests. ${template.room_width_m}×${template.room_length_m}m. Approved community floor plan for weddings & events.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${template.venue_name} — ${template.room_name}`,
    address: template.city ? { '@type': 'PostalAddress', addressLocality: template.city, addressCountry: template.country ?? undefined } : undefined,
    maximumAttendeeCapacity: template.capacity,
  };

  return (
    <>
      <Helmet>
        <title>{title} | Wedding Waitress</title>
        <meta name="description" content={description.slice(0, 158)} />
        <link rel="canonical" href={`${SITE_URL}/venues/${template.id}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description.slice(0, 158)} />
        <meta property="og:url" content={`${SITE_URL}/venues/${template.id}`} />
        {thumb && <meta property="og:image" content={thumb} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="ww-public min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <Link to="/venues" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to directory
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="rounded-xl border border-border bg-card overflow-hidden aspect-[4/3] flex items-center justify-center">
              {thumb ? (
                <img src={thumb} alt={title} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-16 h-16 text-muted-foreground/40" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                {template.featured && (
                  <Badge variant="secondary" className="gap-1"><Sparkles className="w-3 h-3" /> Featured</Badge>
                )}
                <Badge variant="outline">Approved</Badge>
              </div>
              <h1 className="text-3xl font-bold text-foreground">{template.venue_name}</h1>
              <p className="text-lg text-muted-foreground mt-1">{template.room_name}</p>

              <dl className="mt-6 space-y-3 text-sm">
                {(template.city || template.country) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{[template.city, template.country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Capacity up to <strong>{template.capacity}</strong> guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-primary" />
                  <span>Room <strong>{template.room_width_m} × {template.room_length_m}m</strong> · {template.room_shape}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>{template.fixtures?.length ?? 0} fixtures included (bar, dance floor, stage, etc.)</span>
                </div>
              </dl>

              {template.notes && (
                <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4 text-sm text-foreground/80">
                  {template.notes}
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-2">
                <Link to="/dashboard?tab=floor-plan" className="w-full sm:w-auto">
                  <Button className="lv-premium-shade w-full sm:w-auto bg-[#967A59] hover:bg-[#7a6347] text-white">
                    Use this venue in my plan
                  </Button>
                </Link>
                <Link to="/venues" className="w-full sm:w-auto">
                  <Button variant="outline" className="lv-premium-shade w-full sm:w-auto">Browse more venues</Button>
                </Link>
              </div>
            </div>
          </div>

          <section className="mt-12 prose prose-sm max-w-none text-foreground/80">
            <h2 className="text-xl font-semibold text-foreground">About this floor plan</h2>
            <p>
              This approved layout for <strong>{template.venue_name} — {template.room_name}</strong>
              {template.city ? ` (${template.city}${template.country ? `, ${template.country}` : ''})` : ''}
              {' '}gives you a tested starting point for arranging tables, dance floor, stage and bar.
              Load it into Wedding Waitress and your own tables flow straight into the room — no
              measuring, no guesswork.
            </p>
          </section>
        </main>
      </div>
    </>
  );
};
