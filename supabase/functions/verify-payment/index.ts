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
  "prod_UTm2XBA5rX9dGN": { plan_db_id: "632b476a-39da-4f6f-8457-9ba104d571da", name: "Vendor Pro", is_vendor: true  },
};

// RSVP tier product IDs (initial purchase)
const RSVP_PRODUCT_IDS = new Set([
  "prod_Tyt1bSwrpOzxNd",
  "prod_Tyt1FzdN9h5IcQ",
  "prod_Tyt4UbA83epUQG",
  "prod_Tyt4pPolYzGjSf",
  "prod_Tyt5APL1elHibZ",
  "prod_Tyt6a9w3AuwyzB",
]);

// RSVP overage product ID ($10 AUD per 10 extra guests)
const RSVP_OVERAGE_PRODUCT_ID = "prod_URud0pt0K8Sl9i";

// Smart RSVP & Messaging — SMS top-up product ($99 AUD = 250 credits)
const SMS_TOPUP_PRODUCT_ID = "prod_UTh041rdR91og1";
const SMS_TOPUP_CREDITS = 250;
const SMS_INCLUDED_CREDITS = 400;

// Map RSVP tier product IDs -> guest limit unlocked by that tier
const RSVP_TIER_LIMITS: Record<string, number> = {
  "prod_Tyt1bSwrpOzxNd": 100,
  "prod_Tyt1FzdN9h5IcQ": 200,
  "prod_Tyt4UbA83epUQG": 300,
  "prod_Tyt4pPolYzGjSf": 400,
  "prod_Tyt5APL1elHibZ": 500,
  "prod_Tyt6a9w3AuwyzB": 1000,
};

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
      return new Response(JSON.stringify({ status: "pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const lineItem = session.line_items?.data?.[0];
    const price = lineItem?.price;
    const product = price?.product as Stripe.Product | undefined;
    const productId = product?.id || "";
    const metadata = session.metadata || {};
    const eventId = metadata.event_id;

    // Trust Stripe session metadata for user identity (set by create-checkout).
    // This avoids requiring a live auth header on the success-page redirect.
    let userId = metadata.user_id || "";
    if (!userId) {
      // Idempotent re-verify fallback: look up prior record by session id.
      const { data: prior } = await supabase
        .from("rsvp_invite_purchases")
        .select("user_id")
        .eq("stripe_session_id", session_id)
        .maybeSingle();
      userId = prior?.user_id || "";
    }
    if (!userId) throw new Error("user_id missing from session metadata");

    // Resolve user email for downstream notifications (no auth header needed).
    let userEmail = "";
    try {
      const { data: u } = await supabase.auth.admin.getUserById(userId);
      userEmail = u?.user?.email || "";
    } catch (_) { /* non-fatal */ }

    logStep("Product identified", { productId, eventId, userId });

    // ── Additional Event Purchase (one-time, A$99 SKU) ──
    const purchaseTypeMeta = (metadata.purchase_type || "").toString();
    if (purchaseTypeMeta === "additional_event" || productId === "prod_UTm7byFGV7E127") {
      const amountCents = session.amount_total || 0;
      const currency = (session.currency || "AUD").toUpperCase();
      const { data: existingAddl } = await supabase
        .from("additional_event_purchases")
        .select("id")
        .eq("stripe_session_id", session_id)
        .maybeSingle();
      if (!existingAddl) {
        await supabase.from("additional_event_purchases").insert({
          user_id: userId,
          event_id: eventId || null,
          stripe_session_id: session_id,
          stripe_price_id: price?.id || null,
          amount: amountCents,
          currency,
          status: "paid",
        });
        logStep("Additional event slot recorded", { userId, amountCents, currency });
      }
      return new Response(
        JSON.stringify({ success: true, type: "additional_event" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── RSVP Tier Purchase (initial) ──
    if (RSVP_PRODUCT_IDS.has(productId)) {
      if (!eventId) throw new Error("event_id is required for RSVP purchase");

      const amountPaid = (session.amount_total || 0) / 100;
      const grossAmountPaid = amountPaid;
      const tierLabel = product?.name || "";
      const purchasedLimit = RSVP_TIER_LIMITS[productId] ?? null;
      const guestCountAtPurchase = parseInt(
        metadata.guest_count_at_purchase || "0",
        10
      ) || null;

      // Idempotent insert: skip if a tier row already exists for this session
      const { data: existing } = await supabase
        .from("rsvp_invite_purchases")
        .select("id")
        .eq("stripe_session_id", session_id)
        .maybeSingle();

      const dmRaw = (metadata.delivery_method || "").toString();
      const deliveryMethod =
        dmRaw === "email" || dmRaw === "sms" || dmRaw === "both" ? dmRaw : null;

      if (!existing) {
        await supabase.from("rsvp_invite_purchases").insert({
          user_id: userId,
          event_id: eventId,
          amount_paid: amountPaid,
          guest_tier_label: tierLabel,
          stripe_session_id: session_id,
          stripe_payment_id: session.payment_intent as string,
          status: "completed",
          purchase_type: "rsvp_tier",
          purchased_limit: purchasedLimit,
          overage_blocks: 0,
          guest_count_at_purchase: guestCountAtPurchase,
          delivery_method: deliveryMethod,
        });
      }

      // Grant included SMS credits on first activation (idempotent at row level)
      if (!existing) {
        try {
          await supabase.rpc("add_sms_credits", {
            _user_id: userId,
            _event_id: eventId,
            _amount: SMS_INCLUDED_CREDITS,
            _source: "rsvp_tier_activation",
          });
          logStep("Granted included SMS credits", { eventId, credits: SMS_INCLUDED_CREDITS });
        } catch (e) {
          console.error("[VERIFY-PAYMENT] add_sms_credits (activation) failed", e);
        }
      }

      logStep("RSVP tier purchase recorded", { eventId, amountPaid, purchasedLimit });

      // Fire-and-forget confirmation email (only on first verification).
      if (!existing && userEmail) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("id", userId)
            .maybeSingle();
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "rsvp-invitations-sent",
              recipientEmail: userEmail,
              idempotencyKey: `rsvp-sent-${session_id}`,
              templateData: {
                firstName: profile?.first_name || "",
                guestCount: guestCountAtPurchase || 0,
                tierLabel,
                amount: grossAmountPaid.toFixed(2),
                isOverage: false,
              },
            },
          }).then(({ error }) => {
            if (error) console.error("[VERIFY-PAYMENT] rsvp confirmation email failed", error);
          }).catch((e) => console.error("[VERIFY-PAYMENT] rsvp confirmation email failed", e));
        } catch (e) {
          console.error("[VERIFY-PAYMENT] rsvp confirmation email dispatch failed", e);
        }
      }

      return new Response(JSON.stringify({
        type: "rsvp",
        status: "completed",
        plan_name: tierLabel,
        amount_paid: grossAmountPaid,
        stripe_amount_paid: amountPaid,
        purchased_limit: purchasedLimit,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── RSVP Overage Purchase ($10 AUD per 10 extra guests) ──
    if (productId === RSVP_OVERAGE_PRODUCT_ID) {
      if (!eventId) throw new Error("event_id is required for RSVP overage");

      const amountPaid = (session.amount_total || 0) / 100;
      // Quantity = number of 10-guest blocks purchased
      const overageBlocks = parseInt(metadata.overage_blocks || "0", 10) || lineItem?.quantity || 0;
      const guestCountAtPurchase = parseInt(
        metadata.guest_count_at_purchase || "0",
        10
      ) || null;

      // Idempotent: skip if this session was already recorded
      const { data: existing } = await supabase
        .from("rsvp_invite_purchases")
        .select("id")
        .eq("stripe_session_id", session_id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("rsvp_invite_purchases").insert({
          user_id: userId,
          event_id: eventId,
          amount_paid: amountPaid,
          guest_tier_label: `Overage +${overageBlocks * 10} guests`,
          stripe_session_id: session_id,
          stripe_payment_id: session.payment_intent as string,
          status: "completed",
          purchase_type: "rsvp_overage",
          purchased_limit: null,
          overage_blocks: overageBlocks,
          guest_count_at_purchase: guestCountAtPurchase,
        });
      }

      logStep("RSVP overage recorded", { eventId, amountPaid, overageBlocks });

      // Fire-and-forget confirmation email (only on first verification).
      if (!existing && userEmail) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("id", userId)
            .maybeSingle();
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "rsvp-invitations-sent",
              recipientEmail: userEmail,
              idempotencyKey: `rsvp-sent-${session_id}`,
              templateData: {
                firstName: profile?.first_name || "",
                guestCount: overageBlocks * 10,
                tierLabel: "",
                amount: amountPaid.toFixed(2),
                isOverage: true,
              },
            },
          }).then(({ error }) => {
            if (error) console.error("[VERIFY-PAYMENT] rsvp overage email failed", error);
          }).catch((e) => console.error("[VERIFY-PAYMENT] rsvp overage email failed", e));
        } catch (e) {
          console.error("[VERIFY-PAYMENT] rsvp overage email dispatch failed", e);
        }
      }

      return new Response(JSON.stringify({
        type: "rsvp_overage",
        status: "completed",
        amount_paid: amountPaid,
        overage_blocks: overageBlocks,
        extra_guests: overageBlocks * 10,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }


    // ── Smart RSVP & Messaging — SMS Top-up ──
    if (productId === SMS_TOPUP_PRODUCT_ID) {
      if (!eventId) throw new Error("event_id is required for SMS top-up");

      const amountPaid = (session.amount_total || 0) / 100;
      const blocks = lineItem?.quantity ?? 1;
      const credits = SMS_TOPUP_CREDITS * blocks;

      // Idempotency: only grant credits + record once per session
      const { data: existing } = await supabase
        .from("rsvp_invite_purchases")
        .select("id")
        .eq("stripe_session_id", session_id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("rsvp_invite_purchases").insert({
          user_id: userId,
          event_id: eventId,
          amount_paid: amountPaid,
          guest_tier_label: `SMS Top-up +${credits} credits`,
          stripe_session_id: session_id,
          stripe_payment_id: session.payment_intent as string,
          status: "completed",
          purchase_type: "sms_topup",
          purchased_limit: null,
          overage_blocks: 0,
          guest_count_at_purchase: null,
        });

        try {
          await supabase.rpc("add_sms_credits", {
            _user_id: userId,
            _event_id: eventId,
            _amount: credits,
            _source: "topup",
          });
          logStep("SMS top-up credits granted", { eventId, credits });
        } catch (e) {
          console.error("[VERIFY-PAYMENT] add_sms_credits (topup) failed", e);
        }
      }

      return new Response(JSON.stringify({
        type: "sms_topup",
        status: "completed",
        amount_paid: amountPaid,
        credits_added: credits,
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
        .select("expires_at, grace_period_ends_at, download_only_ends_at")
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
      const downloadOnlyEndsAt = new Date(newExpiry);
      downloadOnlyEndsAt.setDate(downloadOnlyEndsAt.getDate() + 30);

      const { error: updateError } = await supabase
        .from("user_subscriptions")
        .update({
          expires_at: newExpiry.toISOString(),
          grace_period_ends_at: newGrace.toISOString(),
          download_only_ends_at: downloadOnlyEndsAt.toISOString(),
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
    const downloadOnlyEndsAt = new Date(expiresAt);
    downloadOnlyEndsAt.setDate(downloadOnlyEndsAt.getDate() + 30);

    // Update user_subscriptions
    const { error: subError } = await supabase
      .from("user_subscriptions")
      .update({
        plan_id: planInfo.plan_db_id,
        status,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        grace_period_ends_at: gracePeriodEndsAt.toISOString(),
        download_only_ends_at: downloadOnlyEndsAt.toISOString(),
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
      // userEmail was resolved earlier via admin.getUserById(userId)
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
    // Always return 200 so the success page can show a friendly fallback
    // instead of a red "Edge Function returned non-2xx" error.
    return new Response(JSON.stringify({ status: "pending", error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
