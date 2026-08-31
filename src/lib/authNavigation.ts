export type SignInRedirectState = {
  signIn?: {
    returnTo?: unknown;
  };
};

const protectedRoutePrefixes = ['/dashboard', '/account', '/admin'] as const;

export const getSafeAuthenticatedReturnTo = (
  value: unknown,
  fallback = '/dashboard',
) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  const isProtectedDestination = protectedRoutePrefixes.some(
    (prefix) => value === prefix || ['/', '?', '#'].some((separator) => value.startsWith(`${prefix}${separator}`)),
  );

  return isProtectedDestination ? value : fallback;
};

export const createSignInRedirectState = (returnTo: string): SignInRedirectState => ({
  signIn: { returnTo: getSafeAuthenticatedReturnTo(returnTo) },
});

export const readSignInRedirectState = (state: unknown) => {
  if (!state || typeof state !== 'object') return null;
  const returnTo = (state as SignInRedirectState).signIn?.returnTo;
  if (typeof returnTo !== 'string') return null;
  return getSafeAuthenticatedReturnTo(returnTo);
};
