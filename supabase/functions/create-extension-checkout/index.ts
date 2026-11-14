import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@22.4.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { ACCESS_EXTENSION_GST_MAX_MONTHS, ACCESS_EXTENSION_GST_PRICING_VERSION, ACCESS_EXTENSION_LIVE_PRICE_ID, ACCESS_EXTENSION_LIVE_PRODUCT_ID, accessExtensionAmountCents, parseAccessExtensionMonths } from '../_shared/accessExtensionRules.ts';
import { PAID_PLAN_LIVE_CHECKOUT_ENABLED } from '../_shared/paidPlanFulfillmentEvidence.ts';
import { retrieveWorldwideGstRate, WORLDWIDE_GST_RATE_SECRET, worldwideGstLineItem, validateWorldwideGstCustomer } from '../_shared/worldwideGst.ts';

const PAID_PLANS = new Set(["Essential", "Premium", "Unlimited", "Ultimate"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const safeOrigin = (req: Request) => {
  const requested = req.headers.get("origin") || "";
  if (requested === "https://weddingwaitress.com.au" || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requested)) {
    return requested;
  }
  return Deno.env.get("SITE_URL") || "https://weddingwaitress.com.au";
};

serve(async (req) => {
  const suspensionResponse = await guardSuspendedCustomer(req);
  if (suspensionResponse) return suspensionResponse;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  if (!PAID_PLAN_LIVE_CHECKOUT_ENABLED) return respond({ error: 'Checkout is not activated.' }, 503);

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!url || !serviceKey || !stripeKey) throw new Error("Server configuration error");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return respond({ error: "Authentication required" }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.slice(7));
    const user = userData.user;
    if (userError || !user?.email) return respond({ error: "Authentication failed" }, 401);

    const { data: isMaster, error: masterError } = await admin.rpc("is_account_master", { _user_id: user.id });
    if (masterError || isMaster !== true) {
      return respond({ error: "Only the Master Account Holder can manage billing." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const months = parseAccessExtensionMonths(body?.extension_months);
    if (!months || months > ACCESS_EXTENSION_GST_MAX_MONTHS) {
      return respond({ error: `Extension duration must be a whole number from 1 to ${ACCESS_EXTENSION_GST_MAX_MONTHS} months.` }, 400);
    }
    if (body?.price_id != null) {
      return respond({ error: "Client-supplied prices are not accepted." }, 400);
    }

    const { data: planRows, error: planError } = await admin.rpc("get_user_plan", { _user_id: user.id });
    const plan = Array.isArray(planRows) ? planRows[0] : null;
    if (planError || !plan || !PAID_PLANS.has(plan.plan_name)) {
      return respond({ error: "Access extensions require an Essential, Premium, or Ultimate plan." }, 409);
    }

    const { data: subscription, error: subscriptionError } = await admin.from("user_subscriptions")
      .select("expires_at,access_recovery_ends_at")
      .eq("user_id", user.id).single();
    const { data: lifecycle } = await admin.from("account_lifecycle")
      .select("status").eq("account_owner_id", user.id).maybeSingle();
    if (subscriptionError || !subscription?.expires_at) return respond({ error: "Subscription could not be verified." }, 409);
    if (lifecycle?.status === "permanently_deleted") return respond({ error: "This account is no longer recoverable." }, 410);
    if (lifecycle?.status === "scheduled_for_deletion") {
      return respond({ error: "This account is closed. Restore the account before purchasing an access extension." }, 409);
    }
    const nowMs = Date.now();
    const expired = new Date(subscription.expires_at).getTime() <= nowMs;
    const recoveryMs = subscription.access_recovery_ends_at
      ? new Date(subscription.access_recovery_ends_at).getTime()
      : 0;
    if (expired && (!recoveryMs || recoveryMs <= nowMs)) {
      return respond({ error: "The six-month account recovery period has ended." }, 410);
    }
    // Stripe Checkout requires at least 30 minutes before session expiry. Do
    // not accept a payment that could finish after a known recovery deadline.
    if (expired && recoveryMs - nowMs < 31 * 60 * 1000) {
      return respond({ error: "The account recovery period is too close to its deadline for online checkout. Contact support." }, 409);
    }

    const amountCents = accessExtensionAmountCents(months);
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-07-29.dahlia" });
    const gstRateId = await retrieveWorldwideGstRate(stripe, Deno.env.get(WORLDWIDE_GST_RATE_SECRET), true);
    const extensionPrice = await stripe.prices.retrieve(ACCESS_EXTENSION_LIVE_PRICE_ID);
    const extensionProductId = typeof extensionPrice.product === 'string' ? extensionPrice.product : extensionPrice.product?.id;
    if (extensionPrice.active !== true || extensionPrice.livemode !== true || extensionPrice.currency !== 'aud'
      || extensionPrice.unit_amount !== 2000 || extensionPrice.recurring != null || extensionPrice.tax_behavior !== 'exclusive'
      || extensionProductId !== ACCESS_EXTENSION_LIVE_PRODUCT_ID) throw new Error('Verified extension price is unavailable.');
    const customers = await stripe.customers.list({ email: user.email, limit: 100 });
    if (customers.has_more) throw new Error('Customer lookup requires review before checkout.');
    const ownedCustomers = customers.data.filter((customer: Stripe.Customer) =>
      [customer.metadata?.user_id, customer.metadata?.wedding_waitress_user_id].includes(user.id));
    if (ownedCustomers.length > 1) throw new Error('Multiple account customers require review before checkout.');
    const customerId = ownedCustomers.length ? validateWorldwideGstCustomer(ownedCustomers[0], user.id, true) : undefined;
    const origin = safeOrigin(req);
    const metadata = {
      type: "access_extension",
      purchase_type: "access_extension",
      extension_months: String(months),
      expected_amount_cents: String(amountCents),
      pricing_currency: "AUD",
      user_id: user.id,
      plan_name_at_checkout: plan.plan_name,
      access_expiry_at_checkout: subscription.expires_at,
      expected_tax_cents: String(months * 200),
      expected_total_cents: String(months * 2200),
      pricing_version: ACCESS_EXTENSION_GST_PRICING_VERSION,
    };

    const session = await stripe.checkout.sessions.create({
      integration_identifier: 'ww-extension-tmvrjqxs',
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [worldwideGstLineItem({ quantity: months, price: ACCESS_EXTENSION_LIVE_PRICE_ID }, gstRateId)],
      mode: "payment",
      automatic_tax: { enabled: false },
      metadata,
      payment_intent_data: { metadata },
      expires_at: expired ? Math.floor(Math.min(nowMs + 24 * 60 * 60 * 1000, recoveryMs) / 1000) : undefined,
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/account/plan-billing?extension=cancelled`,
    });

    console.log("[CREATE-EXTENSION-CHECKOUT] created", { sessionId: session.id, userId: user.id, months, amountCents });
    return respond({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout could not be created";
    console.error("[CREATE-EXTENSION-CHECKOUT] failed", { message });
    return respond({ error: message }, 500);
  }
});
