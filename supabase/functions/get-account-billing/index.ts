// 🔒 PRODUCTION-LOCKED — Account billing data fetcher (2026-04-18)
// Returns Stripe payment method, last invoice, next billing, history, and portal URL.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(
      token,
    );
    if (userError || !userData.user?.email) {
      throw new Error("Not authenticated");
    }
    const user = userData.user;

    // No Stripe key → return empty data gracefully
    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          paymentMethod: null,
          lastInvoice: null,
          nextBillingDate: null,
          history: [],
          portalUrl: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return new Response(
        JSON.stringify({
          paymentMethod: null,
          lastInvoice: null,
          nextBillingDate: null,
          history: [],
          portalUrl: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const customerId = customers.data[0].id;

    // Fetch payment method, invoices, subscription in parallel
    const [pmList, invoiceList, subList] = await Promise.all([
      stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 }),
      stripe.invoices.list({ customer: customerId, limit: 10 }),
      stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 }),
    ]);

    const pm = pmList.data[0];
    const paymentMethod = pm?.card
      ? { brand: pm.card.brand, last4: pm.card.last4 }
      : null;

    const invoices = invoiceList.data;
    const lastInvoice = invoices[0]
      ? {
          amount: invoices[0].amount_paid / 100,
          currency: invoices[0].currency,
          date: new Date(invoices[0].created * 1000).toISOString(),
          hostedUrl: invoices[0].hosted_invoice_url,
          pdfUrl: invoices[0].invoice_pdf,
        }
      : null;

    const sub = subList.data[0];
    const nextBillingDate = sub?.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

    const history = invoices.map((inv) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      type: inv.amount_paid > 0 ? "Payment" : "Adjustment",
      amount: inv.amount_paid / 100,
      currency: inv.currency,
      status: inv.status,
      hostedUrl: inv.hosted_invoice_url,
      pdfUrl: inv.invoice_pdf,
    }));

    // Build portal URL
    const origin = req.headers.get("origin") || "https://weddingwaitress.com";
    let portalUrl: string | null = null;
    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/dashboard?tab=account`,
      });
      portalUrl = portal.url;
    } catch (e) {
      console.error("Portal session error:", e);
    }

    return new Response(
      JSON.stringify({
        paymentMethod,
        lastInvoice,
        nextBillingDate,
        history,
        portalUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[get-account-billing]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
