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
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
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
    if (!user?.email) {
      return new Response(
        JSON.stringify({ error: "Not authenticated. Please sign in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { price_id, mode, event_id, plan_type, ui_mode } = await req.json();
    if (!price_id) throw new Error("price_id is required");

    const checkoutMode = mode === "subscription" ? "subscription" : "payment";
    const isEmbedded = ui_mode === "embedded";
    logStep("Checkout params", { price_id, checkoutMode, event_id, plan_type, isEmbedded });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer", { customerId });
    } else {
      logStep("No existing customer, will create via checkout");
    }

    const origin = req.headers.get("origin") || "https://wedding-waitress.lovable.app";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: checkoutMode as Stripe.Checkout.SessionCreateParams.Mode,
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      // When a customer is reused, Stripe will NOT save the address collected
      // at checkout (and therefore won't use it for automatic tax) unless we
      // opt in via customer_update. Required for GST to compute on returning
      // customers whose Stripe customer record has no AU address yet.
      ...(customerId
        ? { customer_update: { address: "auto", name: "auto" } }
        : {}),
      metadata: {
        user_id: user.id,
        plan_type: plan_type || "",
        event_id: event_id || "",
      },
    };

    if (isEmbedded) {
      sessionParams.ui_mode = "embedded";
      sessionParams.return_url = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    } else {
      sessionParams.success_url = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
      sessionParams.cancel_url = `${origin}/dashboard`;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id });

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
