const encode=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
async function key(){return crypto.subtle.importKey('raw',new TextEncoder().encode(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function createWishAccess(itemId:string,token:string,slideshow:boolean){
 const payload=encode(new TextEncoder().encode(JSON.stringify({id:itemId,token,slideshow,exp:Date.now()+3600000})));
 const signature=encode(new Uint8Array(await crypto.subtle.sign('HMAC',await key(),new TextEncoder().encode(payload))));
 return `${payload}.${signature}`;
}
export async function readWishAccess(grant:string){
 const [payload,signature,...rest]=grant.split('.');
 if(!payload||!signature||rest.length)throw new Error('Not authorised');
 const decode=(s:string)=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 if(!await crypto.subtle.verify('HMAC',await key(),decode(signature),new TextEncoder().encode(payload)))throw new Error('Not authorised');
 const data=JSON.parse(new TextDecoder().decode(decode(payload)));
 if(!data.id||!data.token||!(data.exp>Date.now()))throw new Error('Not authorised');
 return data;
}
