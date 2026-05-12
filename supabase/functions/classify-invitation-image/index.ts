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

const FILENAME_HINTS: Array<[RegExp, string[]]> = [
  [/baby\s*shower/i, ['Baby Shower']],
  [/baby\s*boy|teddy.*blue|blue.*teddy/i, ['Baby Boy', 'Baby Shower']],
  [/baby\s*girl|teddy.*pink|pink.*teddy/i, ['Baby Girl', 'Baby Shower']],
  [/wedding/i, ['Wedding']],
  [/engagement/i, ['Engagement']],
  [/bridal/i, ['Bridal Shower']],
  [/birthday/i, ['Birthday']],
  [/floral|flower|rose/i, ['Floral']],
  [/greenery|leaf|leaves|eucalyptus/i, ['Greenery']],
  [/tropical|palm/i, ['Tropical']],
  [/watercolor|watercolour/i, ['Watercolor']],
  [/luxury|premium/i, ['Luxury']],
  [/gold/i, ['Gold', 'Luxury']],
  [/black.*white|monochrome/i, ['Black & White', 'Modern Minimal']],
  [/minimal|modern/i, ['Modern Minimal']],
  [/rustic|wood/i, ['Rustic']],
  [/boho|pampas/i, ['Boho']],
  [/vintage/i, ['Vintage']],
  [/islam|muslim|nikah|mosque/i, ['Islamic']],
  [/christian|church|cross/i, ['Christian']],
  [/indian|hindu|mehndi|haldi/i, ['Indian']],
  [/arabic|calligraphy/i, ['Arabic']],
  [/turkish|lantern/i, ['Turkish']],
  [/kid|child/i, ['Kids']],
];

const fallbackFromFilename = (filename: string): string[] => {
  const matched = new Set<string>();
  for (const [regex, cats] of FILENAME_HINTS) {
    if (regex.test(filename)) cats.forEach((c) => matched.add(c));
  }
  return matched.size ? Array.from(matched) : ['Other'];
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
      return new Response(JSON.stringify({ categories: fallbackFromFilename(safeFilename) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You classify wedding/event invitation card designs into 1-4 categories from this fixed list ONLY:
${ALLOWED_CATEGORIES.join(', ')}.
Rules:
- Pick the most visually relevant categories (theme, colors, decorative elements, event type cues, typography style).
- An image can belong to multiple categories (e.g. "Islamic" + "Luxury" + "Floral").
- Respond with STRICT JSON: {"categories": ["Cat1", "Cat2"]}. No prose.`;

    const userText = `Filename hint: "${safeFilename}". Classify this invitation image.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
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
      return new Response(JSON.stringify({ categories: fallbackFromFilename(safeFilename) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: { categories?: unknown } = {};
    try { parsed = typeof content === 'string' ? JSON.parse(content) : content; } catch { /* ignore */ }

    const raw = Array.isArray(parsed.categories) ? parsed.categories : [];
    const allowedSet = new Set(ALLOWED_CATEGORIES.map((c) => c.toLowerCase()));
    const cleaned = Array.from(new Set(
      raw
        .map((c) => String(c).trim())
        .filter((c) => allowedSet.has(c.toLowerCase()))
        .map((c) => ALLOWED_CATEGORIES.find((a) => a.toLowerCase() === c.toLowerCase())!)
    )).slice(0, 4);

    const categories = cleaned.length ? cleaned : fallbackFromFilename(safeFilename);

    return new Response(JSON.stringify({ categories }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('classify-invitation-image error', err);
    return new Response(JSON.stringify({ categories: ['Other'] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
