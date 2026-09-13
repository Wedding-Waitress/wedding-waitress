import { validateRefundSelection } from './adminRefundRules.ts';

// These dependencies are server-only. No browser-supplied customer/payment reference is trusted.
export async function resolveRefundPayment(admin: any, stripe: any, paymentType: string, paymentId: string, expectedLive: boolean) {
  const tables: Record<string,string> = { plan_purchase:'event_purchases', verified_plan_purchase:'paid_plan_purchases', rsvp_bundle:'rsvp_invite_purchases', sms_top_up:'rsvp_invite_purchases' };
  if (!tables[paymentType] && paymentType!=='promotion_plan_purchase') throw new Error('This payment type requires a separately reviewed refund mapping.');
  const { data: payment, error } = paymentType==='promotion_plan_purchase'
    ? await admin.rpc('promotion_refund_payment_context',{p_id:paymentId})
    : await admin.from(tables[paymentType]).select('*').eq('id',paymentId).single();
  if (error || !payment?.user_id) throw new Error('Recorded payment could not be verified.');
  if (tables[paymentType]==='rsvp_invite_purchases' && (payment.status!=='completed' && payment.status!=='succeeded')) throw new Error('Payment is not recorded as completed.');
  let reference = payment.stripe_payment_intent_id || payment.stripe_payment_id || payment.stripe_session_id;
  if (typeof reference !== 'string') throw new Error('No Stripe payment reference is recorded.');
  if (reference.startsWith('cs_')) {
    const session = await stripe.checkout.sessions.retrieve(reference);
    if (session.payment_status!=='paid' || session.livemode!==expectedLive || session.mode!=='payment') throw new Error('Stripe checkout payment cannot be refunded here.');
    reference = typeof session.payment_intent==='string' ? session.payment_intent : session.payment_intent?.id;
  }
  let charge;
  if (reference?.startsWith('pi_')) {
    const intent = await stripe.paymentIntents.retrieve(reference, { expand:['latest_charge'] });
    if (intent.status!=='succeeded' || intent.livemode!==expectedLive) throw new Error('Stripe payment is not successful in the expected mode.');
    charge = typeof intent.latest_charge==='string' ? await stripe.charges.retrieve(intent.latest_charge) : intent.latest_charge;
  } else if (reference?.startsWith('ch_')) charge = await stripe.charges.retrieve(reference);
  else throw new Error('Unsupported Stripe payment reference.');
  if (!charge?.paid || !charge.captured || charge.disputed || charge.currency!=='aud' || charge.livemode!==expectedLive || charge.status!=='succeeded') throw new Error('Stripe payment is not eligible for an AUD refund.');
  const recordedMinor=['verified_plan_purchase','promotion_plan_purchase'].includes(paymentType)?Number(payment.amount_total_cents):Math.round(Number(payment.amount_paid)*100);
  if (recordedMinor!==charge.amount) throw new Error('Recorded amount does not match the actual Stripe payment.');
  return { payment, charge, remaining:charge.amount-charge.amount_refunded };
}

export async function reconcileRefund(admin: any, stripe: any, record: any) {
  let refund;
  if (record.stripe_refund_id) refund = await stripe.refunds.retrieve(record.stripe_refund_id);
  else {
    // Never repeat a create request after an uncertain outcome or after Stripe's idempotency TTL.
    for await (const candidate of stripe.refunds.list({ charge:record.charge_id, limit:100 })) {
      if (candidate.metadata?.ww_refund_request===record.id) { refund=candidate; break; }
    }
  }
  if (!refund) return record;
  const chargeId=typeof refund.charge==='string'?refund.charge:refund.charge?.id;
  if (chargeId!==record.charge_id || refund.amount!==Number(record.amount_minor) || refund.currency!==record.currency || refund.livemode!==record.livemode || refund.metadata?.ww_refund_request!==record.id) throw new Error('Provider refund evidence mismatch.');
  const {data,error}=await admin.rpc('admin_record_payment_refund',{p_request_id:record.id,p_refund_id:refund.id,p_status:refund.status});
  if(error || !data) throw new Error('Refund was found but its database status could not be confirmed.');
  return data;
}

export async function submitRefund(admin: any, stripe: any, actor: string, body: any, expectedLive: boolean) {
  if(body.confirmed!==true || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(body.request_id))) throw new Error('Explicit refund confirmation and request identity are required.');
  const {payment,charge,remaining}=await resolveRefundPayment(admin,stripe,body.payment_type,body.payment_id,expectedLive);
  // A replay is reconciled, never created again, even if refundable balance has changed.
  const previous=await admin.from('admin_payment_refunds').select('*').eq('id',body.request_id).maybeSingle();
  if(previous.error) throw new Error('Refund history is unavailable.');
  const amount=body.amount_minor, reason=String(body.reason||'').trim(), customerReason=String(body.customer_reason||'').trim();
  validateRefundSelection(amount,previous.data ? Number(previous.data.amount_minor) : remaining,body.access_choice,reason,customerReason);
  const {data:reserved,error}=await admin.rpc('admin_reserve_payment_refund',{p_actor:actor,p_request:{id:body.request_id,account_owner_id:payment.user_id,payment_type:body.payment_type,payment_id:body.payment_id,charge_id:charge.id,amount_minor:amount,currency:'aud',livemode:expectedLive,reason,access_choice:body.access_choice,customer_reason:customerReason}});
  if(error || !reserved?.record) throw new Error('Refund request could not be reserved. Check outstanding refund history.');
  if(!reserved.is_new) return reconcileRefund(admin,stripe,reserved.record);
  try {
    const refund=await stripe.refunds.create({charge:charge.id,amount,metadata:{ww_refund_request:body.request_id}}, {idempotencyKey:`ww-refund-${body.request_id}`});
    // Retrieve the provider object again; never trust a browser payload or a stale webhook event.
    return await reconcileRefund(admin,stripe,{...reserved.record,stripe_refund_id:refund.id});
  } catch {
    await admin.from('admin_payment_refunds').update({status:'unknown',updated_at:new Date().toISOString()}).eq('id',body.request_id).eq('status','submitting');
    throw new Error('Refund outcome is unconfirmed. Refresh refund history; do not start a replacement request.');
  }
}
