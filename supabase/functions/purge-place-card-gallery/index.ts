import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: isAdmin, error: adminError } = await userClient.rpc("is_owner_admin");
    if (adminError || isAdmin !== true) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const bucket = "place-card-gallery";
    let totalRemoved = 0;
    const walk = async (prefix: string) => {
      let offset = 0;
      while (true) {
        const { data: items, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
        if (error) throw error;
        if (!items || items.length === 0) break;
        const files: string[] = [];
        const folders: string[] = [];
        for (const it of items) {
          const path = prefix ? `${prefix}/${it.name}` : it.name;
          if ((it as any).id === null || (it as any).id === undefined) folders.push(path);
          else files.push(path);
        }
        if (files.length) {
          const { error: rmErr } = await supabase.storage.from(bucket).remove(files);
          if (rmErr) throw rmErr;
          totalRemoved += files.length;
        }
        for (const f of folders) await walk(f);
        if (items.length < 1000) break;
        offset += 1000;
      }
    };
    await walk("");

    // Clear join table first to avoid FK issues
    await supabase.from("place_card_image_categories").delete().not("image_id", "is", null);

    const { count, error: delErr } = await supabase
      .from("place_card_gallery_images")
      .delete({ count: "exact" })
      .not("id", "is", null);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ success: true, files_removed: totalRemoved, rows_deleted: count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
