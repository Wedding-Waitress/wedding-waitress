// One-time admin reclassification of Uncategorized invitation gallery images.
// Single-category-only enforcement: each image ends up with exactly one category row.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  [/chinese|双喜|lantern.*red|red.*gold/i, 'Chinese'],
  [/asian|japanese|korean|sakura/i, 'Asian'],
  [/tropical|palm|beach/i, 'Tropical'],
  [/floral|flower|rose|peony/i, 'Floral'],
  [/luxury|premium|gold/i, 'Luxury'],
  [/minimal|modern|clean/i, 'Minimal'],
  [/vintage|retro|antique/i, 'Vintage'],
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

const slugify = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function classifyOne(imageUrl: string, filename: string, apiKey: string): Promise<string> {
  const systemPrompt = `You classify wedding/event invitation card designs into EXACTLY ONE category from this fixed list:
${ALLOWED_CATEGORIES.join(', ')}.

Rules:
- Pick the SINGLE most visually dominant category. Never pick more than one.
- Use the strongest visual cue (theme, dominant color, decorative motifs, religious/cultural symbols, event type).
- Disambiguation:
  * Quran/mosque/Arabic calligraphy => Islamic
  * Cross/church/baptism => Religious
  * Christmas tree/wreath/Santa => Christmas
  * Chinese double-happiness/red+gold lanterns => Chinese
  * Japanese/Korean/pan-Asian motifs (not specifically Chinese) => Asian
  * Wedding-with-flowers => Floral
  * Gold-luxury frames => Luxury
  * Beige/blank/minimalist => Minimal
  * Pure decorative borders => Elegant or Floral
- Use Uncategorized ONLY when truly nothing fits.
- Respond with STRICT JSON: {"category":"X"}. No prose.`;

  for (let attempt = 0; attempt < 3; attempt++) {
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
              { type: 'text', text: `Filename hint: "${filename}". Choose the single best category.` },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (aiRes.status === 429) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (!aiRes.ok) {
      console.warn('AI gateway error', aiRes.status, await aiRes.text());
      return fallbackFromFilename(filename);
    }
    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: { category?: unknown } = {};
    try { parsed = typeof content === 'string' ? JSON.parse(content) : content; } catch { /* ignore */ }
    const raw = String(parsed.category ?? '').trim();
    const match = ALLOWED_CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
    return match ?? fallbackFromFilename(filename);
  }
  return fallbackFromFilename(filename);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth: verify caller is admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userRes.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find Uncategorized category id
    const { data: uncatRow } = await admin
      .from('invitation_categories')
      .select('id')
      .eq('name', 'Uncategorized')
      .maybeSingle();

    // Load all images
    const { data: allImages, error: imgErr } = await admin
      .from('invitation_gallery_images')
      .select('id, name, image_url, thumbnail_url');
    if (imgErr) throw imgErr;

    // Load join rows
    const { data: joins, error: joinErr } = await admin
      .from('invitation_image_categories')
      .select('image_id, category_id, invitation_categories(name)');
    if (joinErr) throw joinErr;

    const byImage = new Map<string, string[]>();
    for (const j of (joins ?? []) as any[]) {
      const arr = byImage.get(j.image_id) ?? [];
      const n = j?.invitation_categories?.name;
      if (typeof n === 'string') arr.push(n);
      byImage.set(j.image_id, arr);
    }

    // Targets: image has zero categories OR only Uncategorized
    const targets = (allImages ?? []).filter((img: any) => {
      const cats = byImage.get(img.id) ?? [];
      if (cats.length === 0) return true;
      return cats.every((c) => c === 'Uncategorized');
    });

    // Cache category id by name
    const catIdCache = new Map<string, string>();
    if (uncatRow) catIdCache.set('Uncategorized', (uncatRow as any).id);

    const ensureCategoryId = async (name: string): Promise<string> => {
      const cached = catIdCache.get(name);
      if (cached) return cached;
      const { data: existing } = await admin
        .from('invitation_categories')
        .select('id')
        .eq('name', name)
        .maybeSingle();
      if (existing?.id) {
        catIdCache.set(name, existing.id);
        return existing.id;
      }
      const { data: inserted, error } = await admin
        .from('invitation_categories')
        .insert({ name, slug: slugify(name) })
        .select('id')
        .single();
      if (error || !inserted) throw error ?? new Error('Failed to create category');
      catIdCache.set(name, inserted.id);
      return inserted.id;
    };

    const perCategory: Record<string, number> = {};
    let processed = 0;
    let failed = 0;

    // Process with limited concurrency
    const CONCURRENCY = 5;
    let cursor = 0;
    const total = targets.length;

    const worker = async () => {
      while (true) {
        const i = cursor++;
        if (i >= total) return;
        const img: any = targets[i];
        try {
          const chosen = await classifyOne(img.image_url, img.name ?? '', apiKey);
          const catId = await ensureCategoryId(chosen);

          // Wipe + insert one (single-category guarantee)
          await admin.from('invitation_image_categories').delete().eq('image_id', img.id);
          const { error: insErr } = await admin
            .from('invitation_image_categories')
            .insert({ image_id: img.id, category_id: catId });
          if (insErr) throw insErr;

          perCategory[chosen] = (perCategory[chosen] ?? 0) + 1;
          processed++;
          await sleep(200);
        } catch (e) {
          console.warn('reclassify failed for', img.id, e);
          failed++;
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker()));

    const stillUncategorized = perCategory['Uncategorized'] ?? 0;

    return new Response(JSON.stringify({
      total,
      processed,
      failed,
      perCategory,
      stillUncategorized,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('reclassify-uncategorized-invitations error', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
