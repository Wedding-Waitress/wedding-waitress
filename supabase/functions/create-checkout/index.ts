import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { convertedAmountCents, getAudExchangeRates, isPricingCurrency } from "../_shared/exchangeRates.ts";

const PUBLIC_PLAN_CATALOG = {
  essential: { product: "prod_UOQhHcOhFdrhOs", baseAud: 199, mode: "payment" },
  premium: { product: "prod_UOQhTWnFzXV1FK", baseAud: 249, mode: "payment" },
  unlimited: { product: "prod_UOQhLIYTxQAd7U", baseAud: 299, mode: "payment" },
} as const;

const GUEST_CAPACITY_TOPUP_FALLBACK_PRICE_ID = "price_1TT0o05GzTmqOxGKUIiEXxj6";
const GUEST_CAPACITY_TOPUP_PRODUCT_ID = "prod_URud0pt0K8Sl9i";
const COMMUNICATION_CREDIT_PACKS = {
  credits_10: {
    credits: 10,
    unitAmount: 1000,
    priceSecret: 'STRIPE_COMMUNICATION_TOPUP_10_PRICE_ID',
    productSecret: 'STRIPE_COMMUNICATION_TOPUP_10_PRODUCT_ID',
  },
  credits_100: {
    credits: 100,
    unitAmount: 4900,
    priceSecret: 'STRIPE_COMMUNICATION_TOPUP_PRICE_ID',
    productSecret: 'STRIPE_COMMUNICATION_TOPUP_PRODUCT_ID',
  },
} as const;
type CommunicationCreditPackKey = keyof typeof COMMUNICATION_CREDIT_PACKS;
const PAID_WEDDING_PLAN_IDS = new Set([
  "78cdab0d-d81d-4757-b7cc-f210b8b30f47",
  "1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8",
  "cd10f207-2109-4546-a635-0baa68ba8213",
]);
const ADDITIONAL_EVENT_PRICES: Record<string, { currency: string; unitAmount: number }> = {
  price_1TUoZ15GzTmqOxGKDRmvofDh: { currency: 'aud', unitAmount: 9900 },
  price_1TUoZT5GzTmqOxGK92kQqFuO: { currency: 'usd', unitAmount: 7499 },
  price_1TUobn5GzTmqOxGKQSvVqcFY: { currency: 'gbp', unitAmount: 6499 },
  price_1TUocE5GzTmqOxGK9qKIXoHT: { currency: 'eur', unitAmount: 6999 },
};
const ADDITIONAL_EVENT_PRODUCT_ID = 'prod_UTm7byFGV7E127';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  );
  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Not authenticated. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Auth error", { message: userError.message });
      return new Response(
        JSON.stringify({ error: "Your session has expired. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user = data.user;
    const { data: operational } = await supabaseClient.rpc("is_account_operational", { p_user_id: user.id });
    if (operational !== true) return new Response(JSON.stringify({ error: "Account access is closed" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!user?.email) {
      return new Response(
        JSON.stringify({ error: "Not authenticated. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Master-only guard for billing/checkout flows.
    {
      const { data: isMaster } = await supabaseClient.rpc("is_account_master", { _user_id: user.id });
      if (isMaster === false) {
        logStep("Blocked non-master checkout attempt", { userId: user.id });
        return new Response(
          JSON.stringify({ error: "Only the Master Account Holder can manage billing." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const {
      price_id: requested_price_id,
      mode,
      event_id,
      plan_type,
      ui_mode,
      quantity,
      purchase_type,
      communication_topup_pack,
      guest_count_at_purchase,
      idempotency_key,
      delivery_method,
      upgrade_from_plan,
      pricing_currency,
    } = await req.json();
    const isCommunicationTopup = purchase_type === 'communication_topup';
    const isGuestCapacityTopup = purchase_type === 'guest_capacity_topup';
    const isAdditionalEvent = purchase_type === 'additional_event';
    if (plan_type === 'vendor_pro') {
      return new Response(JSON.stringify({ error: 'Vendor Pro is not currently available' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (plan_type === 'rsvp' || purchase_type === 'rsvp_overage') {
      return new Response(JSON.stringify({ error: 'Legacy RSVP bundles are no longer available; use your included Email & SMS credits or an approved 10- or 100-credit top-up.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const communicationPackKey = typeof communication_topup_pack === 'string'
      ? communication_topup_pack as CommunicationCreditPackKey
      : '';
    const communicationPack = isCommunicationTopup && communicationPackKey in COMMUNICATION_CREDIT_PACKS
      ? COMMUNICATION_CREDIT_PACKS[communicationPackKey]
      : null;
    if (isCommunicationTopup && !communicationPack) {
      return new Response(JSON.stringify({ error: 'Select an approved communication credit pack.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const price_id = isCommunicationTopup
      ? (Deno.env.get(communicationPack!.priceSecret) || '')
      : isGuestCapacityTopup
        ? (Deno.env.get('STRIPE_GUEST_CAPACITY_PRICE_ID') || GUEST_CAPACITY_TOPUP_FALLBACK_PRICE_ID)
        : requested_price_id;
    const publicPlan = !upgrade_from_plan && typeof plan_type === "string" && plan_type in PUBLIC_PLAN_CATALOG
      ? PUBLIC_PLAN_CATALOG[plan_type as keyof typeof PUBLIC_PLAN_CATALOG]
      : null;
    if (publicPlan && !isPricingCurrency(pricing_currency)) {
      return new Response(JSON.stringify({ error: "Unsupported pricing currency" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!price_id && !publicPlan) throw new Error(isCommunicationTopup ? 'Selected communication top-up price is not configured' : 'price_id is required');

    const checkoutMode = publicPlan ? publicPlan.mode : mode === "subscription" ? "subscription" : "payment";
    const isEmbedded = ui_mode === "embedded";
    const lineQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    if (isCommunicationTopup && lineQuantity !== 1) {
      return new Response(JSON.stringify({ error: 'Communication credit packs must be purchased one at a time.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (isAdditionalEvent && (lineQuantity !== 1 || !price_id || !ADDITIONAL_EVENT_PRICES[price_id])) {
      return new Response(JSON.stringify({ error: 'Invalid additional-event price.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (isGuestCapacityTopup && (!Number.isInteger(quantity) || lineQuantity < 1 || lineQuantity > 100)) {
      return new Response(JSON.stringify({ error: 'Guest capacity must be purchased in 1 to 100 whole blocks of 10.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (isGuestCapacityTopup) {
      if (!event_id) return new Response(JSON.stringify({ error: 'An event is required for guest capacity.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const [{ data: ownedEvent }, { data: subscription }] = await Promise.all([
        supabaseClient.from('events').select('id').eq('id', event_id).eq('user_id', user.id).maybeSingle(),
        supabaseClient.from('user_subscriptions').select('plan_id, status').eq('user_id', user.id).in('status', ['active', 'trialing', 'grace_period']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!ownedEvent) return new Response(JSON.stringify({ error: 'Only the event owner can purchase guest capacity.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (!subscription || !PAID_WEDDING_PLAN_IDS.has(subscription.plan_id) || !['active', 'trialing', 'grace_period'].includes(subscription.status)) {
        return new Response(JSON.stringify({ error: 'Guest capacity add-ons require an active Essential, Premium or Ultimate plan.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    if (isCommunicationTopup) {
      if (!event_id) return new Response(JSON.stringify({ error: 'An event is required for communication credits.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const [{ data: ownedEvent }, { data: subscription }] = await Promise.all([
        supabaseClient.from('events').select('id').eq('id', event_id).eq('user_id', user.id).maybeSingle(),
        supabaseClient.from('user_subscriptions').select('plan_id, status, expires_at, is_read_only').eq('user_id', user.id).in('status', ['active', 'trialing', 'grace_period']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      const isCurrent = subscription
        && PAID_WEDDING_PLAN_IDS.has(subscription.plan_id)
        && subscription.is_read_only !== true
        && (!subscription.expires_at || new Date(subscription.expires_at).getTime() >= Date.now());
      if (!ownedEvent) return new Response(JSON.stringify({ error: 'Only the event owner can purchase communication credits.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (!isCurrent) return new Response(JSON.stringify({ error: 'Communication credit top-ups require an active Essential, Premium or Ultimate plan.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (isAdditionalEvent) {
      const { data: subscription } = await supabaseClient
        .from('user_subscriptions')
        .select('plan_id, status, expires_at, is_read_only')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'grace_period'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const isCurrent = subscription &&
        PAID_WEDDING_PLAN_IDS.has(subscription.plan_id) &&
        subscription.is_read_only !== true &&
        (!subscription.expires_at || new Date(subscription.expires_at).getTime() >= Date.now());
      if (!isCurrent) {
        return new Response(JSON.stringify({ error: 'An existing current Essential, Premium or Ultimate plan is required before adding an event.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    const purchaseTypeMeta =
      upgrade_from_plan ? "plan_upgrade" :
      purchase_type === "rsvp_overage" ? "rsvp_overage" :
      purchase_type === "guest_capacity_topup" ? "guest_capacity_topup" :
      purchase_type === "additional_event" ? "additional_event" :
      (purchase_type || "");
    logStep("Checkout params", {
      price_id,
      checkoutMode,
      event_id,
      plan_type,
      isEmbedded,
      quantity: lineQuantity,
      purchase_type: purchaseTypeMeta,
      communication_topup_pack: isCommunicationTopup ? communicationPackKey : '',
      upgrade_from_plan: upgrade_from_plan || "",
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create the Stripe customer. Do not force a country: Stripe Tax
    // determines GST/VAT from the customer's verified checkout location.
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const created = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = created.id;
      logStep("Created Stripe customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://wedding-waitress.lovable.app";

    // ── Plan upgrade — difference-only pricing ────────────────────────
    // Allowed source→target pairs among one-time wedding plans only.
    // Source/target prices are looked up from Stripe so currency stays consistent.
    let upgradeLineItem: Stripe.Checkout.SessionCreateParams.LineItem | null = null;
    let upgradeDiffMeta = "";
    let resolvedProductId = "";
    let resolvedCurrency = "";
    let originalAmountCents = 0;
    let checkoutQuote: { currency: string; amount: number; base_aud: number; rate: number; updated_at: string; source: string } | null = null;
    if (upgrade_from_plan) {
      const ALLOWED: Record<string, Record<string, true>> = {
        essential: { premium: true, unlimited: true },
        premium: { unlimited: true },
      };
      const fromKey = String(upgrade_from_plan);
      const toKey = String(plan_type || "");
      if (!ALLOWED[fromKey]?.[toKey]) {
        return new Response(JSON.stringify({ error: "Invalid upgrade path" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Source plan DB id mapping (kept in sync with planRegistry.ts).
      const SOURCE_PLAN_DB_ID: Record<string, string> = {
        essential: "78cdab0d-d81d-4757-b7cc-f210b8b30f47",
        premium: "1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8",
      };
      // All known price_ids for the source plan across currencies.
      const SOURCE_PRICE_IDS: Record<string, string[]> = {
        essential: [
          "price_1UDdle5GzTmqOxGKj3yu56jP",
          "price_1UDdle5GzTmqOxGKuDmLmMN9",
          "price_1UDdle5GzTmqOxGKizBfLKQj",
          "price_1UDdlf5GzTmqOxGK2nP9Y3vP",
          "price_1T0vD35GzTmqOxGK3k6EQZee",
          "price_1TMhcx5GzTmqOxGKxMjCfQkz",
          "price_1TMheB5GzTmqOxGK2RUVqDvC",
          "price_1TMher5GzTmqOxGKTI0fTE07",
          "price_1TPdpf5GzTmqOxGKTiE9x3RG",
        ],
        premium: [
          "price_1UDeO75GzTmqOxGK2JYrvH7I",
          "price_1UDeO85GzTmqOxGKpE4I9I3x",
          "price_1UDeO85GzTmqOxGKPHstNiGn",
          "price_1UDeO85GzTmqOxGKjs1pGVUi",
          "price_1T0vDN5GzTmqOxGKf3kyvjxs",
          "price_1TMhhr5GzTmqOxGKolZGjdWK",
          "price_1TMhlz5GzTmqOxGK1t1zUOCw",
          "price_1TMhmL5GzTmqOxGKAW9J3JMC",
          "price_1TPdq05GzTmqOxGKEPamRNNq",
        ],
      };

      // Verify the user actually owns the source plan.
      const { data: sub } = await supabaseClient
        .from("user_subscriptions")
        .select("plan_id, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!sub || sub.plan_id !== SOURCE_PLAN_DB_ID[fromKey]) {
        return new Response(JSON.stringify({ error: "Source plan not found on account" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Retrieve target price + product + currency.
      const targetPrice = await stripe.prices.retrieve(price_id);
      const targetCurrency = targetPrice.currency;
      const targetProductId = typeof targetPrice.product === "string"
        ? targetPrice.product
        : targetPrice.product?.id;
      if (!targetProductId || !targetPrice.unit_amount) {
        throw new Error("Target price is missing product or amount");
      }
      resolvedProductId = targetProductId;
      resolvedCurrency = targetCurrency;

      // Find the source price in the SAME currency.
      let sourceUnitAmount: number | null = null;
      for (const pid of SOURCE_PRICE_IDS[fromKey]) {
        try {
          const sp = await stripe.prices.retrieve(pid);
          if (sp.currency === targetCurrency && sp.unit_amount) {
            sourceUnitAmount = sp.unit_amount;
            break;
          }
        } catch (_) { /* skip missing price */ }
      }
      if (sourceUnitAmount == null) {
        return new Response(JSON.stringify({ error: "Could not resolve source plan price" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const diff = targetPrice.unit_amount - sourceUnitAmount;
      if (diff <= 0) {
        return new Response(JSON.stringify({ error: "Upgrade not available for this currency" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      upgradeLineItem = {
        quantity: 1,
        price_data: {
          currency: targetCurrency,
          product: targetProductId,
          unit_amount: diff,
          tax_behavior: "inclusive",
        },
      };
      upgradeDiffMeta = String(diff);
      originalAmountCents = diff;
      logStep("Upgrade difference computed", {
        fromKey, toKey, currency: targetCurrency, diff,
      });
    }

    if (publicPlan) {
      const quote = await getAudExchangeRates(true);
      resolvedProductId = publicPlan.product;
      resolvedCurrency = pricing_currency.toLowerCase();
      originalAmountCents = convertedAmountCents(publicPlan.baseAud, pricing_currency, quote.rates);
      checkoutQuote = {
        currency: pricing_currency,
        amount: originalAmountCents,
        base_aud: publicPlan.baseAud * 100,
        rate: quote.rates[pricing_currency],
        updated_at: quote.updatedAt,
        source: quote.source,
      };
    } else if (!resolvedProductId) {
      const resolvedPrice = await stripe.prices.retrieve(price_id);
      resolvedProductId = typeof resolvedPrice.product === "string" ? resolvedPrice.product : resolvedPrice.product?.id || "";
      resolvedCurrency = resolvedPrice.currency;
      originalAmountCents = (resolvedPrice.unit_amount || 0) * lineQuantity;
      if (isCommunicationTopup) {
        const configuredProductId = Deno.env.get(communicationPack!.productSecret) || '';
        if (!configuredProductId
          || resolvedPrice.id !== price_id
          || resolvedProductId !== configuredProductId
          || resolvedPrice.currency !== 'aud'
          || resolvedPrice.unit_amount !== communicationPack!.unitAmount
          || lineQuantity !== 1) {
          throw new Error(`Communication top-up does not match the approved ${communicationPack!.credits}-credit catalogue item`);
        }
      }
      if (isGuestCapacityTopup && (
        resolvedPrice.id !== price_id ||
        resolvedProductId !== GUEST_CAPACITY_TOPUP_PRODUCT_ID ||
        resolvedPrice.currency !== 'aud' ||
        resolvedPrice.unit_amount !== 1000
      )) {
        throw new Error('Guest capacity must be exactly $10 AUD per block of 10 spaces');
      }
      if (isAdditionalEvent) {
        const allowed = ADDITIONAL_EVENT_PRICES[price_id];
        if (resolvedProductId !== ADDITIONAL_EVENT_PRODUCT_ID || resolvedPrice.currency !== allowed.currency || resolvedPrice.unit_amount !== allowed.unitAmount) {
          throw new Error('Additional-event price does not match the approved catalogue');
        }
      }
    }
    if (!resolvedProductId || !resolvedCurrency || originalAmountCents <= 0) throw new Error("Purchase price is not configured");

    let checkoutLineItem: Stripe.Checkout.SessionCreateParams.LineItem = publicPlan
      ? { quantity: 1, price_data: {
          currency: resolvedCurrency,
          product: resolvedProductId,
          unit_amount: originalAmountCents,
          tax_behavior: "exclusive",
          ...(publicPlan.mode === "subscription" ? { recurring: { interval: "month" as const } } : {}),
        } }
      : upgradeLineItem ?? { price: price_id, quantity: lineQuantity };
    const isBaseRsvp = plan_type === "rsvp" && price_id === "price_1TSzPs5GzTmqOxGK4Ca8kAAz";
    if (isBaseRsvp) originalAmountCents = 10000;
    if (isBaseRsvp) {
      checkoutLineItem = { quantity: 1, price_data: { currency: resolvedCurrency, product: resolvedProductId, unit_amount: originalAmountCents, tax_behavior: "inclusive" } };
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [checkoutLineItem],
      mode: checkoutMode as Stripe.Checkout.SessionCreateParams.Mode,
      automatic_tax: { enabled: true },
      customer_update: { address: "auto" },
      metadata: {
        user_id: user.id,
        plan_type: plan_type || "",
        event_id: event_id || "",
        purchase_type: purchaseTypeMeta,
        communication_topup_pack: isCommunicationTopup ? communicationPackKey : "",
        overage_blocks:
          purchaseTypeMeta === "rsvp_overage" || purchaseTypeMeta === "guest_capacity_topup" ? String(lineQuantity) : "",
        guest_count_at_purchase:
          guest_count_at_purchase != null ? String(guest_count_at_purchase) : "",
        delivery_method:
          delivery_method === "email" || delivery_method === "sms" || delivery_method === "both"
            ? delivery_method
            : "",
        from_plan: upgrade_from_plan || "",
        to_plan: upgrade_from_plan ? (plan_type || "") : "",
        upgrade_diff_amount: upgradeDiffMeta,
        original_amount_cents: String(originalAmountCents),
        pricing_base_aud_cents: checkoutQuote ? String(checkoutQuote.base_aud) : "",
        pricing_currency: checkoutQuote?.currency || resolvedCurrency.toUpperCase(),
        pricing_exchange_rate: checkoutQuote ? String(checkoutQuote.rate) : "",
        pricing_quote_timestamp: checkoutQuote?.updated_at || "",
        pricing_rate_source: checkoutQuote?.source || "",
      },
    };

    if (isEmbedded) {
      sessionParams.ui_mode = "embedded";
      sessionParams.return_url = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    } else {
      sessionParams.success_url = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
      sessionParams.cancel_url = isCommunicationTopup
        ? `${origin}/dashboard?tab=guest-list&payment=cancelled&ptype=communication_topup`
        : `${origin}/dashboard`;
    }

    const requestOptions =
      typeof idempotency_key === "string" && idempotency_key.length > 0
        ? { idempotencyKey: idempotency_key }
        : undefined;
    const session = await stripe.checkout.sessions.create(sessionParams, requestOptions);
    logStep("Checkout session created", { sessionId: session.id, idempotent: !!requestOptions });

    // Derive Stripe publishable key from the secret-key environment so the
    // embedded client can initialise Stripe.js without a separate build secret.
    // Pattern: sk_<env>_... -> pk_<env>_... is NOT a 1:1 swap, so we require
    // STRIPE_PUBLISHABLE_KEY when using embedded mode.
    const publishableKey = Deno.env.get("STRIPE_PUBLISHABLE_KEY") || "";

    if (isEmbedded) {
      if (!publishableKey) {
        throw new Error("STRIPE_PUBLISHABLE_KEY secret is required for embedded checkout");
      }
      if (!publishableKey.startsWith("pk_live_") && !publishableKey.startsWith("pk_test_")) {
        throw new Error(
          "STRIPE_PUBLISHABLE_KEY is invalid — must start with pk_live_ or pk_test_"
        );
      }
      return new Response(
        JSON.stringify({ client_secret: session.client_secret, publishable_key: publishableKey, checkout_quote: checkoutQuote }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(JSON.stringify({ url: session.url }), {
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
