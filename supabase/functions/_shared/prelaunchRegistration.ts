export interface PrelaunchRegistration {
  first_name: string; last_name: string; email: string; mobile: string;
  promo_code: string; intended_plan: string | null;
}
export function validatePrelaunchRegistration(value: unknown): PrelaunchRegistration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Enter your registration details.');
  const input = value as Record<string, unknown>;
  const field = (key: string, max: number, required = true) => {
    const raw = input[key];
    if (raw !== undefined && !(raw === null && !required) && typeof raw !== 'string') throw new Error('Enter valid registration details.');
    const result = typeof raw === 'string' ? raw.trim() : '';
    if ((required && !result) || result.length > max || /[\u0000-\u001f\u007f]/.test(result)) throw new Error('Enter valid registration details.');
    return result;
  };
  const email = field('email', 254).toLowerCase();
  const mobile = field('mobile', 32).replace(/[\s()-]/g, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
  if (!/^\+?\d{8,15}$/.test(mobile)) throw new Error('Please enter a valid mobile number.');
  const plan = field('intended_plan', 32, false);
  if (plan && !['essential', 'premium', 'unlimited'].includes(plan)) throw new Error('Please choose a valid package.');
  return { first_name: field('first_name', 100), last_name: field('last_name', 100), email, mobile,
    promo_code: field('promo_code', 64, false), intended_plan: plan || null };
}
