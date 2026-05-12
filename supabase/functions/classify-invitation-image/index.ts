// Smart auto-categorization for invitation gallery images.
// Admin-only. Uses Lovable AI Gateway (Gemini) with vision input + filename hint.

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { imageUrl, filename } = await req.json();
    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'imageUrl required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const safeFilename = typeof filename === 'string' ? filename : '';

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ categories: [fallbackFromFilename(safeFilename)] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You classify wedding/event invitation card designs into EXACTLY ONE category from this fixed list:
${ALLOWED_CATEGORIES.join(', ')}.

Rules:
- Pick the SINGLE most visually dominant category. Never pick more than one.
- Disambiguation:
  * Quran/mosque/Arabic calligraphy => Islamic
  * Cross/church/baptism => Religious
  * Christmas tree/wreath/Santa => Christmas
  * Chinese double-happiness/red+gold lanterns => Chinese
  * Japanese/Korean/pan-Asian motifs => Asian
  * Wedding-with-flowers => Floral
  * Gold-luxury frames => Luxury
  * Beige/blank/minimalist => Minimal
- Use Uncategorized ONLY when truly nothing fits.
- Respond with STRICT JSON: {"category":"X"}. No prose.`;

    const userText = `Filename hint: "${safeFilename}". Choose the single best category.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      console.warn('classify-invitation-image AI gateway failed', aiRes.status, await aiRes.text());
      return new Response(JSON.stringify({ categories: [fallbackFromFilename(safeFilename)] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: { category?: unknown; categories?: unknown } = {};
    try { parsed = typeof content === 'string' ? JSON.parse(content) : content; } catch { /* ignore */ }

    let raw = String((parsed as any).category ?? '').trim();
    if (!raw && Array.isArray((parsed as any).categories) && (parsed as any).categories.length) {
      raw = String((parsed as any).categories[0]).trim();
    }
    const match = ALLOWED_CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
    const chosen = match ?? fallbackFromFilename(safeFilename);

    return new Response(JSON.stringify({ categories: [chosen] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('classify-invitation-image error', err);
    return new Response(JSON.stringify({ categories: ['Uncategorized'] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
