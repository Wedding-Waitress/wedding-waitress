import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getAudExchangeRates } from "../_shared/exchangeRates.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3300",
  "Content-Type": "application/json",
};

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  try {
    const quote = await getAudExchangeRates();
    return new Response(JSON.stringify({ rates: quote.rates, updated_at: quote.updatedAt, source: quote.source, cached: quote.cached }), { headers });
  } catch {
    return new Response(JSON.stringify({ error: "Live conversion is temporarily unavailable" }), { status: 503, headers });
  }
});
