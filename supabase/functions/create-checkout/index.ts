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
      price_id,
      mode,
      event_id,
      plan_type,
      ui_mode,
      quantity,
      purchase_type,
      guest_count_at_purchase,
      idempotency_key,
      delivery_method,
      upgrade_from_plan,
    } = await req.json();
    if (!price_id) throw new Error("price_id is required");

    const checkoutMode = mode === "subscription" ? "subscription" : "payment";
    const isEmbedded = ui_mode === "embedded";
    const lineQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    const purchaseTypeMeta =
      upgrade_from_plan ? "plan_upgrade" :
      purchase_type === "rsvp_overage" ? "rsvp_overage" :
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
      upgrade_from_plan: upgrade_from_plan || "",
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Find OR create the Stripe customer, and ensure address.country = "AU"
    // so Stripe automatic_tax has a location to calculate GST against without
    // collecting a billing address from the user in the embedded checkout UI.
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      const existing = customers.data[0];
      if (!existing.address || existing.address.country !== "AU") {
        await stripe.customers.update(customerId, { address: { country: "AU" } });
        logStep("Customer address forced to AU", { customerId });
      } else {
        logStep("Existing Stripe customer already AU", { customerId });
      }
    } else {
      const created = await stripe.customers.create({
        email: user.email,
        address: { country: "AU" },
        metadata: { user_id: user.id },
      });
      customerId = created.id;
      logStep("Created Stripe customer with AU address", { customerId });
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
          "price_1T0vD35GzTmqOxGK3k6EQZee",
          "price_1TMhcx5GzTmqOxGKxMjCfQkz",
          "price_1TMheB5GzTmqOxGK2RUVqDvC",
          "price_1TMher5GzTmqOxGKTI0fTE07",
          "price_1TPdpf5GzTmqOxGKTiE9x3RG",
        ],
        premium: [
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

    if (!resolvedProductId) {
      const resolvedPrice = await stripe.prices.retrieve(price_id);
      resolvedProductId = typeof resolvedPrice.product === "string" ? resolvedPrice.product : resolvedPrice.product?.id || "";
      resolvedCurrency = resolvedPrice.currency;
      originalAmountCents = (resolvedPrice.unit_amount || 0) * lineQuantity;
    }
    if (!resolvedProductId || !resolvedCurrency || originalAmountCents <= 0) throw new Error("Purchase price is not configured");

    let checkoutLineItem: Stripe.Checkout.SessionCreateParams.LineItem = upgradeLineItem ?? { price: price_id, quantity: lineQuantity };
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
      metadata: {
        user_id: user.id,
        plan_type: plan_type || "",
        event_id: event_id || "",
        purchase_type: purchaseTypeMeta,
        overage_blocks:
          purchaseTypeMeta === "rsvp_overage" ? String(lineQuantity) : "",
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
      },
    };

    if (isEmbedded) {
      sessionParams.ui_mode = "embedded";
      sessionParams.return_url = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    } else {
      sessionParams.success_url = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
      sessionParams.cancel_url = `${origin}/dashboard`;
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
        JSON.stringify({ client_secret: session.client_secret, publishable_key: publishableKey }),
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
