// =============================================================================
// optimize-image — shared edge function for Signage / Invitations / Place Cards.
//
// Generates 3 variants from an uploaded source image:
//   - master.jpg  (full pixel dimensions, JPEG q=92) — for 300 DPI print export
//   - preview.jpg (longest edge 2400px, q=90)        — for the live editor
//   - thumb.jpg   (longest edge  400px, q=75)        — for gallery cards
//
// Inputs: { sourcePath, bucket, folder }
//   - sourcePath must start with `<folder>/<userId>/sources/` — the user can
//     only optimize files they uploaded under their own prefix.
//   - bucket must be one of the allow-listed sign-studio buckets.
//
// Returns: { masterUrl, previewUrl, thumbUrl, width, height }
//
// Notes:
//   - imagescript handles JPEG + PNG natively in Deno; no native deps.
//   - All variants are written to `<bucket>/<folder>/<userId>/optimized/`.
//   - The source upload is removed once the master is written to keep storage tidy.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_BUCKETS = new Set(["signage-gallery", "invitations", "place-cards"]);
const PREVIEW_MAX = 2400;
const THUMB_MAX = 400;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller is authenticated
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
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { sourcePath, bucket, folder } = body ?? {};

    if (!sourcePath || typeof sourcePath !== "string") {
      return new Response(JSON.stringify({ error: "Missing sourcePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
      return new Response(JSON.stringify({ error: "Invalid bucket" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safeFolder = (folder && typeof folder === "string" ? folder : "uploads")
      .replace(/[^a-zA-Z0-9_-]/g, "");

    // Path safety: source must live under <folder>/<userId>/sources/
    const expectedPrefix = `${safeFolder}/${userId}/sources/`;
    if (!sourcePath.startsWith(expectedPrefix)) {
      return new Response(
        JSON.stringify({ error: "sourcePath outside user folder" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Download source
    const { data: dl, error: dlErr } = await admin.storage.from(bucket).download(sourcePath);
    if (dlErr || !dl) {
      return new Response(
        JSON.stringify({ error: `Failed to download source: ${dlErr?.message ?? "not found"}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const bytes = new Uint8Array(await dl.arrayBuffer());

    // Decode & generate variants
    const img = await Image.decode(bytes);
    const width = img.width;
    const height = img.height;
    const longest = Math.max(width, height);

    const masterJpg = await img.encodeJPEG(92);

    const previewScale = longest > PREVIEW_MAX ? PREVIEW_MAX / longest : 1;
    const previewImg = previewScale < 1
      ? img.clone().resize(Math.round(width * previewScale), Math.round(height * previewScale))
      : img.clone();
    const previewJpg = await previewImg.encodeJPEG(90);

    const thumbScale = longest > THUMB_MAX ? THUMB_MAX / longest : 1;
    const thumbImg = thumbScale < 1
      ? img.clone().resize(Math.round(width * thumbScale), Math.round(height * thumbScale))
      : img.clone();
    const thumbJpg = await thumbImg.encodeJPEG(75);

    // Upload variants
    const stamp = Date.now();
    const token = Math.random().toString(36).slice(2, 10);
    const baseDir = `${safeFolder}/${userId}/optimized/${stamp}-${token}`;
    const masterPath = `${baseDir}-master.jpg`;
    const previewPath = `${baseDir}-preview.jpg`;
    const thumbPath = `${baseDir}-thumb.jpg`;

    const uploads = await Promise.all([
      admin.storage.from(bucket).upload(masterPath, masterJpg, {
        contentType: "image/jpeg", upsert: true,
      }),
      admin.storage.from(bucket).upload(previewPath, previewJpg, {
        contentType: "image/jpeg", upsert: true,
      }),
      admin.storage.from(bucket).upload(thumbPath, thumbJpg, {
        contentType: "image/jpeg", upsert: true,
      }),
    ]);
    for (const u of uploads) {
      if (u.error) throw u.error;
    }

    const masterUrl = admin.storage.from(bucket).getPublicUrl(masterPath).data.publicUrl;
    const previewUrl = admin.storage.from(bucket).getPublicUrl(previewPath).data.publicUrl;
    const thumbUrl = admin.storage.from(bucket).getPublicUrl(thumbPath).data.publicUrl;

    // Best-effort cleanup of the source upload
    admin.storage.from(bucket).remove([sourcePath]).catch(() => {});

    return new Response(
      JSON.stringify({
        masterUrl,
        previewUrl,
        thumbUrl,
        width,
        height,
        masterBytes: masterJpg.byteLength,
        previewBytes: previewJpg.byteLength,
        thumbBytes: thumbJpg.byteLength,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("optimize-image error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
