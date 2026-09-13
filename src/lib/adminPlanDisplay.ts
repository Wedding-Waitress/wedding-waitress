/** Presentation only: never changes stored plan identifiers or entitlements. */
export const CURRENT_ADMIN_PLANS = ['Essential', 'Premium', 'Ultimate'] as const;

export function adminPlanLabel(name: string | null): string | null {
  if (!name) return name;
  const key = name.trim().toLowerCase().replace(/[ _-]+/g, ' ').replace(/ plan$/, '');
  if (key === 'essential') return 'Essential';
  if (key === 'premium') return 'Premium';
  if (key === 'ultimate' || key === 'unlimited') return 'Ultimate';
  if (key === 'vendor pro') return 'Vendor Pro (discontinued historical plan)';
  return name;
}

export function adminPlanOptions(names: Array<string | null>): string[] {
  return [...new Set<string>([...CURRENT_ADMIN_PLANS, ...names.map(adminPlanLabel).filter((name): name is string => !!name)])];
}
