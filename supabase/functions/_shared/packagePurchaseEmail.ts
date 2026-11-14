/** Called only after verified paid-plan fulfillment. Stable Checkout identity makes retries idempotent. */
export async function sendPackagePurchaseEmail(admin:any,session:any,term:any){
 if(session.metadata?.plan_purchase_purpose!=='new_plan')return;
 if(session.status!=='complete'||!(session.payment_status==='paid'||session.payment_status==='no_payment_required'&&session.metadata?.promotion_version==='1'&&session.amount_total===0)||session.currency!=='aud')throw Error('Purchase email requires a verified completed payment');
 const catalogue:Record<string,{name:string;credits:number}>={essential:{name:'Essential',credits:150},premium:{name:'Premium',credits:250},unlimited:{name:'Ultimate',credits:450}};
 const plan=catalogue[session.metadata.plan_type];
 if(!plan)throw Error('Purchase email package is invalid');
 const date=(value:string|number)=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))throw Error('Purchase email date is invalid');return d.toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric',timeZone:'Australia/Sydney'});};
 const money=(value:unknown)=>{if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('Purchase email amount is invalid');return 'AUD '+(Number(value)/100).toFixed(2);};
 const {data,error}=await admin.auth.admin.getUserById(session.metadata.user_id);
 if(error||!data?.user?.email)throw Error('Purchase email recipient could not be verified');
 const templateData={firstName:String(data.user.user_metadata?.first_name||'there').slice(0,100),plan:plan.name,credits:plan.credits,subtotal:money(session.amount_subtotal),discount:money(session.total_details?.amount_discount??0),tax:money(session.total_details?.amount_tax??0),total:money(session.amount_total),startsAt:date(term.started_at),expiresAt:date(term.expires_at),paymentDate:date(term.started_at),reference:session.id};
 const sent=await admin.functions.invoke('send-transactional-email',{body:{templateName:'customer-package-purchase',recipientEmail:data.user.email,idempotencyKey:'package-purchase-'+session.id,templateData}});
 if(!sent.error&&sent.data?.reason==='email_suppressed')return;
 if(sent.error||sent.data?.accepted!==true)throw Error('Purchase confirmation acceptance is pending');
}
