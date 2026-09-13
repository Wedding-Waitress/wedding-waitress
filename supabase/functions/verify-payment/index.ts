import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { validatePaidAccessExtension } from '../_shared/accessExtensionRules.ts';
import { validatePaidPlanFulfillmentEvidence, validatePaidPlanLedgerReplayEvidence } from '../_shared/paidPlanFulfillmentEvidence.ts';
import { findOriginalPaymentSuccessEvent } from '../_shared/originalPaymentSuccessEvent.ts';

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
const GUEST_CAPACITY_TOPUP_FALLBACK_PRICE_ID = "price_1TT0o05GzTmqOxGKUIiEXxj6";
const ADDITIONAL_EVENT_PRODUCT_ID = 'prod_UTm7byFGV7E127';
const ADDITIONAL_EVENT_PRICES: Record<string, { currency: string; unitAmount: number }> = {
  price_1TUoZ15GzTmqOxGKDRmvofDh: { currency: 'aud', unitAmount: 9900 },
};

// Smart RSVP & Messaging — SMS top-up product ($99 AUD = 250 credits)
const SMS_TOPUP_PRODUCT_ID = "prod_UTh041rdR91og1";
const SMS_TOPUP_CREDITS = 250;
const SMS_INCLUDED_CREDITS = 400;
const COMMUNICATION_CREDIT_PACKS = {
  credits_10: {
    credits: 10,
    unitAmount: 1000,
    amountAud: 10,
    priceSecret: 'STRIPE_COMMUNICATION_TOPUP_10_PRICE_ID',
    productSecret: 'STRIPE_COMMUNICATION_TOPUP_10_PRODUCT_ID',
  },
  credits_100: {
    credits: 100,
    unitAmount: 4900,
    amountAud: 49,
    priceSecret: 'STRIPE_COMMUNICATION_TOPUP_PRICE_ID',
    productSecret: 'STRIPE_COMMUNICATION_TOPUP_PRODUCT_ID',
  },
} as const;
type CommunicationCreditPackKey = keyof typeof COMMUNICATION_CREDIT_PACKS;

// Map RSVP tier product IDs -> guest limit unlocked by that tier
const RSVP_TIER_LIMITS: Record<string, number> = {
  "prod_Tyt1bSwrpOzxNd": 100,
  "prod_Tyt1FzdN9h5IcQ": 200,
  "prod_Tyt4UbA83epUQG": 300,
  "prod_Tyt4pPolYzGjSf": 400,
  "prod_Tyt5APL1elHibZ": 500,
  "prod_Tyt6a9w3AuwyzB": 1000,
};


serve(async (req) => {
  const suspensionResponse = await guardSuspendedCustomer(req, { allowEntitlementRecovery: true });
  if (suspensionResponse) return suspensionResponse;
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
    const recoveryPlan = PRODUCT_TO_PLAN[productId];
    if (!recoveryPlan || recoveryPlan.is_vendor || metadata.purchase_type) {
      const normalAccessResponse = await guardSuspendedCustomer(req);
      if (normalAccessResponse) return normalAccessResponse;
    }

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

    // ── Additional Event Purchase (one-time, existing paid-plan owners only) ──
    const purchaseTypeMeta = (metadata.purchase_type || "").toString();
    if (purchaseTypeMeta === "additional_event" || productId === ADDITIONAL_EVENT_PRODUCT_ID) {
      if (purchaseTypeMeta !== 'additional_event' || productId !== ADDITIONAL_EVENT_PRODUCT_ID || !lineItem?.price?.id) {
        throw new Error('Additional-event checkout metadata is invalid');
      }
      const amountCents = session.amount_total || 0;
      const currency = (session.currency || "AUD").toUpperCase();
      const allowed = ADDITIONAL_EVENT_PRICES[lineItem.price.id];
      if (!allowed || lineItem.quantity !== 1 || lineItem.price.currency !== allowed.currency || lineItem.price.unit_amount !== allowed.unitAmount || currency !== allowed.currency.toUpperCase() || amountCents < allowed.unitAmount) {
        throw new Error('Additional-event payment does not match the approved catalogue');
      }
      const { data: fulfilment, error: fulfilmentError } = await supabase.rpc('fulfill_additional_event_purchase', {
        _user_id: userId,
        _stripe_session_id: session_id,
        _stripe_price_id: lineItem.price.id,
        _amount: allowed.unitAmount,
        _currency: allowed.currency,
      });
      if (fulfilmentError) throw fulfilmentError;
      logStep("Additional event slot recorded", { userId, amountCents, currency, fulfilment });
      return new Response(
        JSON.stringify({ success: true, type: "additional_event", fulfilment }),
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

    // ── Plan guest-capacity add-on ($10 AUD per block of 10 spaces) ──
    if (purchaseTypeMeta === "guest_capacity_topup") {
      if (!eventId) throw new Error("event_id is required for guest capacity");
      const configuredPriceId = Deno.env.get('STRIPE_GUEST_CAPACITY_PRICE_ID') || GUEST_CAPACITY_TOPUP_FALLBACK_PRICE_ID;
      const overageBlocks = parseInt(metadata.overage_blocks || "0", 10);
      const lineQuantity = lineItem?.quantity || 0;
      if (
        productId !== RSVP_OVERAGE_PRODUCT_ID ||
        lineItem?.price?.id !== configuredPriceId ||
        lineItem?.price?.currency !== 'aud' ||
        lineItem?.price?.unit_amount !== 1000 ||
        !Number.isInteger(overageBlocks) ||
        overageBlocks < 1 ||
        overageBlocks > 100 ||
        lineQuantity !== overageBlocks ||
        session.currency !== 'aud' ||
        session.amount_subtotal !== overageBlocks * 1000
      ) {
        throw new Error('Guest capacity payment does not match the configured $10 AUD blocks');
      }

      const amountPaid = (session.amount_total || 0) / 100;
      const guestCountAtPurchase = parseInt(metadata.guest_count_at_purchase || "0", 10) || null;
      const { data: fulfilment, error: fulfilmentError } = await supabase.rpc('fulfill_guest_capacity_topup', {
        _user_id: userId,
        _event_id: eventId,
        _stripe_session_id: session_id,
        _stripe_payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        _amount_paid: amountPaid,
        _blocks: overageBlocks,
        _guest_count_at_purchase: guestCountAtPurchase,
      });
      if (fulfilmentError) throw fulfilmentError;

      logStep('Guest capacity fulfilled', { eventId, overageBlocks, fulfilment });
      return new Response(JSON.stringify({
        type: 'guest_capacity_topup',
        status: 'completed',
        amount_paid: amountPaid,
        overage_blocks: overageBlocks,
        extra_guests: overageBlocks * 10,
        fulfilment,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // ── Legacy RSVP Overage Purchase ($10 AUD per 10 extra guests) ──
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


    // ── Plan communication-credit top-ups: exact pooled Email & SMS packs ──
    if (metadata.purchase_type === 'communication_topup') {
      if (!eventId) throw new Error('event_id is required for communication top-up');
      // Sessions created before two-pack support did not include a pack key and
      // are safely interpreted as the original 100-credit SKU only.
      const packKey = (metadata.communication_topup_pack || 'credits_100') as CommunicationCreditPackKey;
      const pack = packKey in COMMUNICATION_CREDIT_PACKS ? COMMUNICATION_CREDIT_PACKS[packKey] : null;
      if (!pack) throw new Error('Communication top-up pack is not approved');
      const configuredPriceId = Deno.env.get(pack.priceSecret) || '';
      const configuredProductId = Deno.env.get(pack.productSecret) || '';
      if (!configuredPriceId
        || !configuredProductId
        || lineItem?.price?.id !== configuredPriceId
        || productId !== configuredProductId
        || lineItem?.price?.currency !== 'aud'
        || lineItem?.price?.unit_amount !== pack.unitAmount
        || lineItem?.quantity !== 1
        || session.currency !== 'aud'
        || session.amount_subtotal !== pack.unitAmount
        || session.amount_total !== pack.unitAmount) {
        throw new Error(`Communication top-up payment does not match the approved ${pack.credits}-credit sandbox catalogue item`);
      }
      const { data: fulfilment, error: fulfilmentError } = await supabase.rpc('fulfill_communication_credit_topup', {
        _user_id: userId,
        _event_id: eventId,
        _stripe_session_id: session_id,
        _stripe_payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        _stripe_price_id: configuredPriceId,
        _amount_paid: pack.amountAud,
        _pack_key: packKey,
        _credits: pack.credits,
      });
      if (fulfilmentError) throw fulfilmentError;
      logStep('Communication credits fulfilled', { eventId, packKey, credits: pack.credits, fulfilment });
      return new Response(JSON.stringify({
        type: 'communication_topup',
        status: 'completed',
        amount_paid: pack.amountAud,
        credits_added: pack.credits,
        pack: packKey,
        fulfilment,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // ── Legacy SMS top-up (verification kept only for completed old sessions) ──
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

    // ── Prepaid Access Extension ──
    if (purchaseTypeMeta === "access_extension" || metadata.type === "access_extension") {
      const validation = validatePaidAccessExtension({
        months: metadata.extension_months, metadataAmount: metadata.expected_amount_cents,
        pricingVersion: metadata.pricing_version, productPurchaseType: product?.metadata?.purchase_type,
        paymentStatus: session.payment_status, currency: session.currency?.toLowerCase(), amountTotal: session.amount_total,
        lineCurrency: price?.currency?.toLowerCase(), lineUnitAmount: price?.unit_amount, lineQuantity: lineItem?.quantity,
      });
      if (!validation.ok) throw new Error(`Access-extension payment validation failed: ${validation.reason}`);
      const { months: extensionMonths, amountCents: expectedAmount } = validation;

      const { data: fulfillmentRows, error: fulfillmentError } = await supabase.rpc("fulfill_access_extension", {
        _stripe_session_id: session_id,
        _user_id: userId,
        _months: extensionMonths,
        _amount_cents: expectedAmount,
        _currency: "AUD",
        _payment_status: session.payment_status,
      });
      if (fulfillmentError) throw fulfillmentError;
      const fulfillment = Array.isArray(fulfillmentRows) ? fulfillmentRows[0] : fulfillmentRows;
      logStep("Access extension fulfilled", { extensionMonths, result: fulfillment?.result });

      return new Response(JSON.stringify({
        type: "extension",
        status: "active",
        extension_months: extensionMonths,
        expires_at: fulfillment?.new_expires_at,
        new_expires_at: fulfillment?.new_expires_at,
        fulfillment: fulfillment?.result,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }


    const planInfo = PRODUCT_TO_PLAN[productId];
    if (!planInfo) throw new Error(`Unknown product: ${productId}`);
    if (metadata.pricing_currency && metadata.pricing_currency.toUpperCase() !== 'AUD') {
      throw new Error('New Wedding Waitress plan purchases must be paid in Australian dollars (AUD)');
    }

    if (planInfo.is_vendor) throw new Error('Vendor Pro purchases are unavailable');
    // Always check the metadata owner, including anonymous success-page callbacks.
    // Checking only the caller's token would miss holds on the account receiving access.
    const { data: ownerBlocked, error: ownerAccessError } = await supabase.rpc('is_account_suspension_blocked', { p_user_id: userId });
    if (ownerAccessError || ownerBlocked !== false) throw new Error('Payment account access could not be verified');
    const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    if (!intentId) throw new Error('Verified payment intent is required');
    const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ['latest_charge'] });
    const charge = typeof intent.latest_charge === 'object' && intent.latest_charge ? intent.latest_charge : null;
    if (!charge) throw new Error('Verified captured payment is required');
    const serverNow = Math.floor(Date.now() / 1000);
    const { data: priorPlanPurchase, error: priorPlanError } = await supabase.from('paid_plan_purchases')
      .select('user_id,stripe_session_id,stripe_payment_intent_id,plan_id,purpose,currency,amount_subtotal_cents,amount_total_cents,catalogue_version,payment_reference_at')
      .eq('user_id', userId).eq('stripe_session_id', session.id).maybeSingle();
    if (priorPlanError) throw new Error('Original payment ledger could not be verified');
    // Recorded replay survives Stripe's 30-day event-list retention without
    // inventing an event or deriving a new term from the verification-page time.
    const evidence = priorPlanPurchase
      ? validatePaidPlanLedgerReplayEvidence(session, intent, charge, priorPlanPurchase, serverNow)
      : validatePaidPlanFulfillmentEvidence(session, intent, charge,
        await findOriginalPaymentSuccessEvent(intentId, intent.created, serverNow,
          async (query) => await stripe.events.list(query)), serverNow);
    if (evidence._user_id !== userId || evidence._plan_id !== planInfo.plan_db_id) throw new Error('Payment account evidence is inconsistent');
    const { data: fulfillment, error: fulfillmentError } = await supabase.rpc('fulfill_paid_plan_purchase', evidence);
    if (fulfillmentError) throw new Error('Verified payment fulfillment could not complete');
    if (!fulfillment || !['fulfilled', 'already_fulfilled'].includes(fulfillment.result)
      || fulfillment.plan_id !== evidence._plan_id || !['active', 'expired'].includes(fulfillment.status)
      || !Number.isFinite(Date.parse(fulfillment.started_at)) || !Number.isFinite(Date.parse(fulfillment.expires_at))
      || Date.parse(fulfillment.expires_at) <= Date.parse(fulfillment.started_at)) {
      throw new Error('Verified payment fulfillment returned no valid access term');
    }
    const now = new Date(evidence._payment_reference_at);
    const expiresAt = new Date(fulfillment.expires_at);
    const status = fulfillment.status;
    logStep('Original payment term verified', { result: fulfillment.result, status });

    // Fire-and-forget admin payment notification. Failures must NOT break payment success.
    if (fulfillment.result === 'fulfilled') try {
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
