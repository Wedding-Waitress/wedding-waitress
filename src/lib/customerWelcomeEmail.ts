import { supabase } from '@/integrations/supabase/client';
/** Reuses the verified-account sender and the same key as embedded signup. */
export async function queueCustomerWelcomeEmail(userId:string,email:string,firstName:string){
 const {data,error}=await supabase.functions.invoke('send-transactional-email',{body:{templateName:'welcome',recipientEmail:email.trim().toLowerCase(),idempotencyKey:'welcome-'+userId,templateData:{firstName:firstName.trim()}}});
 if(error||data?.accepted!==true)throw new Error('Welcome email acceptance was not confirmed');
}
