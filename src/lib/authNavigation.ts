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
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }

  // Check the canonical path, since router dot-segment resolution can turn an
  // apparently protected path into a different navigation destination.
  const origin = 'https://weddingwaitress.invalid';
  let destination: URL;
  try {
    destination = new URL(value, origin);
  } catch {
    return fallback;
  }
  if (destination.origin !== origin || destination.pathname.startsWith('//') || /%(?:2f|5c)/i.test(destination.pathname)) {
    return fallback;
  }

  const isProtectedDestination = protectedRoutePrefixes.some(
    (prefix) => destination.pathname === prefix || destination.pathname.startsWith(`${prefix}/`),
  );

  return isProtectedDestination ? `${destination.pathname}${destination.search}${destination.hash}` : fallback;
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
