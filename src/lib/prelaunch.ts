import { supabase } from '@/integrations/supabase/client';
import { validatePrelaunchRegistration } from '../../supabase/functions/_shared/prelaunchRegistration';
export { validatePrelaunchRegistration };
// Deliberate release switch: change only in a reviewed release together with the
// database hold. Browser changes alone can never release the server hold.
export const PRELAUNCH_SIGNUP_HOLD = false;
export const PRELAUNCH_NOTICE = "We’re almost ready to launch Wedding Waitress. Thank you for registering your interest. As soon as we’re ready, we’ll notify you and send you a promotional code for 12 months of access to Wedding Waitress with all features, at up to 50% off, as a thank-you for your patience.";
export async function savePrelaunchRegistration(input: unknown) {
  const registration = validatePrelaunchRegistration(input);
  const { data, error } = await supabase.functions.invoke('register-prelaunch-interest', { body: registration });
  if (error || data?.saved !== true) throw new Error('We couldn’t confirm your registration. Please try again.');
}
