import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';
// Smart auto-categorization for invitation gallery images.
// Categories are inferred locally from the filename; images are never sent to an AI gateway.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_CATEGORIES = [
  'Baby Shower', 'Birthday', 'Celebrations', 'Cultural', 'Floral', 'Glamour',
  'Islamic', 'Religious', 'Tropical', 'Wedding',
  'Asian', 'Chinese', 'Christmas', 'Elegant', 'Luxury', 'Minimal', 'Vintage', 'Kids',
  'Uncategorized',
];

const FILENAME_HINTS: Array<[RegExp, string]> = [
  [/baby\s*shower|teddy/i, 'Baby Shower'],
  [/birthday/i, 'Birthday'],
  [/wedding|bridal|engagement/i, 'Wedding'],
  [/christmas|xmas|santa/i, 'Christmas'],
  [/islam|muslim|nikah|mosque|quran|arabic|calligraphy/i, 'Islamic'],
  [/christian|church|cross|baptism/i, 'Religious'],
  [/chinese|双喜/i, 'Chinese'],
  [/asian|japanese|korean|sakura/i, 'Asian'],
  [/tropical|palm|beach/i, 'Tropical'],
  [/floral|flower|rose|peony|greenery|leaf|leaves|eucalyptus/i, 'Floral'],
  [/luxury|premium|gold/i, 'Luxury'],
  [/minimal|modern|clean/i, 'Minimal'],
  [/vintage|retro|antique|rustic/i, 'Vintage'],
  [/kid|child|cartoon/i, 'Kids'],
  [/elegant/i, 'Elegant'],
  [/glam/i, 'Glamour'],
];

const fallbackFromFilename = (filename: string): string => {
  for (const [regex, cat] of FILENAME_HINTS) {
    if (regex.test(filename)) return cat;
  }
  return 'Uncategorized';
};

Deno.serve(async (req: Request) => {
  const suspensionResponse = await guardSuspendedCustomer(req);
  if (suspensionResponse) return suspensionResponse;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { imageUrl, filename } = await req.json();
    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'imageUrl required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const safeFilename = typeof filename === 'string' ? filename : '';

    return new Response(JSON.stringify({ categories: [fallbackFromFilename(safeFilename)] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('classify-invitation-image error', err);
    return new Response(JSON.stringify({ categories: ['Uncategorized'] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
