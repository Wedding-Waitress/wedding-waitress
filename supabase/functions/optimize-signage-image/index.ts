// Edge function: optimize-signage-image
// Accepts EITHER:
//   - { sourcePath, name, category }  (preferred — file already uploaded to signage-gallery bucket under sources/)
//   - { imageBase64, name, category } (legacy fallback for small images)
// Produces:
//   - Print master JPG (full pixel dimensions, quality 92)  -> originals/<slug>-<ts>.jpg
//   - Web thumbnail JPG (longest edge 800px, quality 75)    -> thumbs/<slug>-<ts>.jpg
// Inserts a row into `signage_gallery_images`. Admin-only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `signage-${Date.now()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is an authenticated admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: adminError } = await userClient.rpc("is_owner_admin");
    if (adminError || isAdmin !== true) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const { sourcePath, imageBase64, name, category } = body ?? {};

    if (!name || !category) {
      return new Response(
        JSON.stringify({ error: "Missing name or category" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!sourcePath && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Missing sourcePath or imageBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load source bytes
    let bytes: Uint8Array;
    if (sourcePath) {
      const { data: dl, error: dlErr } = await admin.storage
        .from("signage-gallery")
        .download(sourcePath);
      if (dlErr || !dl) {
        return new Response(
          JSON.stringify({ error: `Failed to download sourcePath: ${dlErr?.message ?? "not found"}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      bytes = new Uint8Array(await dl.arrayBuffer());
    } else {
      const binary = atob(imageBase64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    }

    // Decode + encode
    const img = await Image.decode(bytes);
    const masterJpg = await img.encodeJPEG(92);

    const longest = Math.max(img.width, img.height);
    const scale = longest > 800 ? 800 / longest : 1;
    const thumbW = Math.max(1, Math.round(img.width * scale));
    const thumbH = Math.max(1, Math.round(img.height * scale));
    const thumbImg = scale < 1 ? img.clone().resize(thumbW, thumbH) : img.clone();
    const thumbJpg = await thumbImg.encodeJPEG(75);

    const slug = slugify(name);
    const stamp = Date.now();
    const masterPath = `originals/${slug}-${stamp}.jpg`;
    const thumbPath = `thumbs/${slug}-${stamp}.jpg`;

    const upMaster = await admin.storage
      .from("signage-gallery")
      .upload(masterPath, masterJpg, { contentType: "image/jpeg", upsert: true });
    if (upMaster.error) throw upMaster.error;

    const upThumb = await admin.storage
      .from("signage-gallery")
      .upload(thumbPath, thumbJpg, { contentType: "image/jpeg", upsert: true });
    if (upThumb.error) throw upThumb.error;

    const masterUrl = admin.storage.from("signage-gallery").getPublicUrl(masterPath).data.publicUrl;
    const thumbUrl = admin.storage.from("signage-gallery").getPublicUrl(thumbPath).data.publicUrl;

    const { data: maxRow } = await admin
      .from("signage_gallery_images")
      .select("sort_order")
      .eq("category", category)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = (maxRow?.sort_order ?? -1) + 1;

    const { data: inserted, error: insertErr } = await admin
      .from("signage_gallery_images")
      .insert({
        name,
        category,
        image_url: masterUrl,
        thumbnail_url: thumbUrl,
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    // Best-effort cleanup of source upload
    if (sourcePath) {
      admin.storage.from("signage-gallery").remove([sourcePath]).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        row: inserted,
        masterBytes: masterJpg.byteLength,
        thumbBytes: thumbJpg.byteLength,
        width: img.width,
        height: img.height,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("optimize-signage-image error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
