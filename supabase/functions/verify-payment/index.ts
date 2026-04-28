import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-PAYMENT] ${step}${d}`);
};

// Product-to-plan mapping (duplicated from stripePrices.ts for edge function context)
const PRODUCT_TO_PLAN: Record<string, { plan_db_id: string; name: string; is_vendor: boolean }> = {
  "prod_UOQhHcOhFdrhOs": { plan_db_id: "78cdab0d-d81d-4757-b7cc-f210b8b30f47", name: "Essential",  is_vendor: false },
  "prod_UOQhTWnFzXV1FK": { plan_db_id: "1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8", name: "Premium",    is_vendor: false },
  "prod_UOQhLIYTxQAd7U": { plan_db_id: "cd10f207-2109-4546-a635-0baa68ba8213", name: "Unlimited",  is_vendor: false },
  "prod_UOQiLXxbgeXKZu": { plan_db_id: "632b476a-39da-4f6f-8457-9ba104d571da", name: "Vendor Pro", is_vendor: true  },
};

// RSVP product IDs
const RSVP_PRODUCT_IDS = new Set([
  "prod_Tyt1bSwrpOzxNd",
  "prod_Tyt1FzdN9h5IcQ",
  "prod_Tyt4UbA83epUQG",
  "prod_Tyt4pPolYzGjSf",
  "prod_Tyt5APL1elHibZ",
  "prod_Tyt6a9w3AuwyzB",
]);

// Extension product IDs
const EXTENSION_PRODUCT_IDS = new Set([
  // Essential extensions
  "prod_TytxX16sHIR9nG", "prod_Tyu7cnAAMQfoWM", "prod_Tyu8DeDOjwI7kF",
  "prod_Tyu9Penbgx0b5M", "prod_TyuAWtZzBIK8VU", "prod_TyuBFmQiiIO7aU",
  "prod_TyuChtV169WvvQ",
  // Premium extensions
  "prod_TyuO2FCjdV9e4c", "prod_TyuOOztgn9A91A", "prod_TyuPcRhvbTuVaQ",
  "prod_TyuQ0vCns1b6sN", "prod_TyuRtJpRuT1GWs", "prod_TyuSqYELiHGkIS",
  "prod_TyuScTpMTUDABh",
  // Unlimited extensions
  "prod_TyuTlpKyA7RoeG", "prod_TyuTVX1fTZbeCc", "prod_TyuUVFhtZRyVYj",
  "prod_TyuUsIDNTY1S16", "prod_TyuUvck5CobTGg", "prod_TyuVXb9EZNXWEz",
  "prod_TyuVFVumB5xkRa",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items.data.price.product"],
    });
    logStep("Session retrieved", { status: session.payment_status, mode: session.mode });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const lineItem = session.line_items?.data?.[0];
    const price = lineItem?.price;
    const product = price?.product as Stripe.Product | undefined;
    const productId = product?.id || "";
    const metadata = session.metadata || {};
    const eventId = metadata.event_id;

    logStep("Product identified", { productId, eventId });

    // ── RSVP Bundle Purchase ──
    if (RSVP_PRODUCT_IDS.has(productId)) {
      if (!eventId) throw new Error("event_id is required for RSVP purchase");

      const amountPaid = (session.amount_total || 0) / 100;
      const tierLabel = product?.name || "";

      await supabase.from("rsvp_invite_purchases").upsert({
        user_id: userId,
        event_id: eventId,
        amount_paid: amountPaid,
        guest_tier_label: tierLabel,
        stripe_session_id: session_id,
        stripe_payment_id: session.payment_intent as string,
        status: "completed",
      }, { onConflict: "event_id,user_id" });

      logStep("RSVP purchase recorded", { eventId, amountPaid });

      return new Response(JSON.stringify({
        type: "rsvp",
        status: "completed",
        plan_name: tierLabel,
        amount_paid: amountPaid,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── Plan Extension Purchase ──
    if (EXTENSION_PRODUCT_IDS.has(productId)) {
      const extensionMonths = parseInt(metadata.extension_months || "0", 10);
      if (!extensionMonths) throw new Error("extension_months metadata missing");

      // Get current subscription
      const { data: subData, error: subFetchError } = await supabase
        .from("user_subscriptions")
        .select("expires_at, grace_period_ends_at")
        .eq("user_id", userId)
        .single();

      if (subFetchError || !subData) throw new Error("Could not fetch subscription");

      // Extend from current expiry (or now if already expired)
      const currentExpiry = new Date(subData.expires_at);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + extensionMonths);

      const newGrace = new Date(newExpiry);
      newGrace.setMonth(newGrace.getMonth() + 6);

      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          expires_at: newExpiry.toISOString(),
          grace_period_ends_at: newGrace.toISOString(),
          status: "active",
          is_read_only: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) throw new Error(`Failed to extend: ${updateError.message}`);

      logStep("Plan extended", { extensionMonths, newExpiry: newExpiry.toISOString() });

      return new Response(JSON.stringify({
        type: "extension",
        status: "active",
        extension_months: extensionMonths,
        new_expires_at: newExpiry.toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }


    const planInfo = PRODUCT_TO_PLAN[productId];
    if (!planInfo) throw new Error(`Unknown product: ${productId}`);

    const now = new Date();
    let expiresAt: Date;
    let status = "active";

    if (planInfo.is_vendor) {
      // Vendor Pro: 30-day billing cycle, requires admin approval
      expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30);
      status = "pending_approval";
      logStep("Vendor Pro — pending admin approval");
    } else {
      // One-time plans: 12 months
      expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Grace period = 6 months after expiry
    const gracePeriodEndsAt = new Date(expiresAt);
    gracePeriodEndsAt.setMonth(gracePeriodEndsAt.getMonth() + 6);

    // Update user_subscriptions
    const { error: subError } = await supabase
      .from("user_subscriptions")
      .update({
        plan_id: planInfo.plan_db_id,
        status,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        grace_period_ends_at: gracePeriodEndsAt.toISOString(),
        is_read_only: planInfo.is_vendor ? true : false, // Vendor Pro is read-only until approved
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (subError) {
      logStep("ERROR updating subscription", { error: subError.message });
      throw new Error(`Failed to update subscription: ${subError.message}`);
    }

    logStep("Subscription updated", { plan: planInfo.name, status, expiresAt: expiresAt.toISOString() });

    // Fire-and-forget admin payment notification. Failures must NOT break payment success.
    try {
      const amountPaid = ((session.amount_total || 0) / 100).toFixed(2);
      const userEmail = userData.user.email || "";
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .maybeSingle();
      const fullName = profile
        ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || userEmail
        : userEmail;

      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "admin-new-payment",
          recipientEmail: "support@weddingwaitress.com.au",
          idempotencyKey: `admin-payment-${session_id}`,
          templateData: {
            name: fullName,
            email: userEmail,
            amount: amountPaid,
            plan: planInfo.name,
            date: now.toISOString(),
          },
        },
      }).then(({ error }) => {
        if (error) console.error("[VERIFY-PAYMENT] admin payment email failed", error);
      }).catch((e) => console.error("[VERIFY-PAYMENT] admin payment email failed", e));
    } catch (e) {
      console.error("[VERIFY-PAYMENT] admin payment email dispatch failed", e);
    }

    return new Response(JSON.stringify({
      type: "plan",
      status,
      plan_name: planInfo.name,
      expires_at: expiresAt.toISOString(),
      requires_approval: planInfo.is_vendor,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
