import Stripe from 'https://esm.sh/stripe@22.6.0'
import { createClient } from 'npm:@supabase/supabase-js@2.57.2'
import { fulfillPaidPlanWebhook } from '../_shared/paidPlanWebhook.ts'
import { validatePaidAccessExtension } from '../_shared/accessExtensionRules.ts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_ACCESS_EXTENSION_WEBHOOK_SECRET')
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!stripeKey || !webhookSecret || !url || !serviceKey) return json({ error: 'Server configuration error' }, 500)

  const signature = req.headers.get('stripe-signature')
  if (!signature) return json({ error: 'Stripe signature required' }, 400)
  const stripe = new Stripe(stripeKey, { apiVersion: '2026-08-26.dahlia' })
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(), signature, webhookSecret, undefined, Stripe.createSubtleCryptoProvider(),
    )
  } catch {
    return json({ error: 'Invalid Stripe signature' }, 400)
  }

  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    return json({ received: true, ignored: true })
  }

  try {
  const incoming = event.data.object as Stripe.Checkout.Session
  const session = await stripe.checkout.sessions.retrieve(incoming.id, { expand: ['line_items.data.price.product'] })
  // A signed event must agree with the freshly retrieved provider session.
  if (event.livemode !== session.livemode) return json({ error: 'Checkout mode mismatch' }, 422)
  const metadata = session.metadata || {}
  if (metadata.purchase_type !== 'access_extension' && metadata.type !== 'access_extension') {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    return json(await fulfillPaidPlanWebhook(session, stripe, admin))
  }
  if (session.payment_status !== 'paid') return json({ received: true, pending: true })

  const item = session.line_items?.data?.[0]
  const price = item?.price
  const product = price?.product as Stripe.Product | undefined
  const userId = metadata.user_id || ''
  const validation = validatePaidAccessExtension({
    months: metadata.extension_months, metadataAmount: metadata.expected_amount_cents,
    pricingVersion: metadata.pricing_version, productPurchaseType: product?.metadata?.purchase_type,
    paymentStatus: session.payment_status, currency: session.currency?.toLowerCase(), amountTotal: session.amount_total,
    lineCurrency: price?.currency?.toLowerCase(), lineUnitAmount: price?.unit_amount, lineQuantity: item?.quantity,
    linePriceId: price?.id, lineProductId: product?.id, amountSubtotal: session.amount_subtotal,
    amountTax: session.total_details?.amount_tax, amountDiscount: session.total_details?.amount_discount,
    amountShipping: session.total_details?.amount_shipping, sessionComplete: session.status === 'complete',
    sessionLive: session.livemode, lineCount: session.line_items?.data?.length, linesHasMore: session.line_items?.has_more,
  })
  if (!userId || !validation.ok) {
    console.error('[ACCESS-EXTENSION-WEBHOOK] rejected catalogue mismatch', { sessionId: session.id })
    return json({ error: 'Checkout does not match the approved access-extension catalogue' }, 422)
  }
  const { months, amountCents: amount } = validation

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data, error } = await admin.rpc('totalCents' in validation ? 'fulfill_access_extension_gst' : 'fulfill_access_extension', {
    _stripe_session_id: session.id,
    _user_id: userId,
    _months: months,
    _amount_cents: amount,
    _currency: 'AUD',
    _payment_status: session.payment_status,
    ...('totalCents' in validation ? { _tax_cents: validation.taxCents, _total_cents: validation.totalCents } : {}),
  })
  if (error) {
    console.error('[ACCESS-EXTENSION-WEBHOOK] fulfillment failed', { sessionId: session.id, message: error.message })
    return json({ error: 'Fulfillment failed' }, 500)
  }
  const result = Array.isArray(data) ? data[0]?.result : data?.result
  return json({ received: true, fulfillment: result || 'completed' })
  } catch {
    // A retryable failure must not acknowledge a paid but unfulfilled checkout.
    console.error('[PAID-CHECKOUT-WEBHOOK] fulfillment needs retry')
    return json({ error: 'Fulfillment could not be verified' }, 500)
  }
})
