export async function notifyTrialInterest(key: string | undefined, requestId: string, details: Record<string,string>, send: typeof fetch = fetch) {
 if (!key) throw new Error('The email service is unavailable. Please retry shortly.');
 const text = ['A venue has requested an extended free trial of Wedding Waitress.', '', ...Object.entries(details).map(([label,value]) => label + ': ' + value), '', 'Please contact the venue to discuss the extended trial and provide a promo code. No trial or account has been created automatically.'].join('\n');
 const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const response = await send('https://api.resend.com/emails', {method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'venue-trial-'+requestId+'-'+digest},body:JSON.stringify({from:'Wedding Waitress <support@weddingwaitress.com.au>',to:['support@weddingwaitress.com.au'],reply_to:details['Venue email'],subject:'Extended free trial interest — '+details['Venue name'].replace(/[\r\n]/g,' '),text})});
 if (!response.ok) throw new Error('Could not notify Wedding Waitress about your trial interest. Please retry.');
}
