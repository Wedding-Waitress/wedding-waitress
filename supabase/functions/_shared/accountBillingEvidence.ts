export function ownedBillingCustomer(page:any,userId:string,live:boolean){
 if(!Array.isArray(page?.data)||page.has_more)throw Error('Customer lookup requires review');
 const owned=page.data.filter((c:any)=>!c.deleted&&[c.metadata?.user_id,c.metadata?.wedding_waitress_user_id].includes(userId));
 if(owned.length>1)throw Error('Multiple account customers require review');
 const customer=owned[0];
 if(customer&&(customer.object!=='customer'||customer.livemode!==live||!/^cus_[A-Za-z0-9]+$/.test(customer.id)))throw Error('Customer account evidence is invalid');
 return customer?.id??null;
}
export function billingChargeHistory(charges:any[]){
 return charges.filter(c=>!c.invoice).map(c=>{
 if(c.object!=='charge'||!Number.isSafeInteger(c.amount)||c.amount<0||!Number.isSafeInteger(c.amount_refunded)||c.amount_refunded<0||c.amount_refunded>c.amount||!Number.isFinite(c.created))throw Error('Payment history evidence is invalid');
 const paid=c.status==='succeeded'&&c.paid===true&&c.captured===true;
 return {id:c.id,date:new Date(c.created*1000).toISOString(),type:'Payment',amount:c.amount/100,currency:c.currency,status:paid?(c.amount_refunded===c.amount&&c.amount_refunded>0?'refunded':c.amount_refunded>0?'partially_refunded':'paid'):c.status,hostedUrl:c.receipt_url??null,pdfUrl:null};
 });
}
