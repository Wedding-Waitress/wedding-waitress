const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'code',
  'team_invitation',
]);

/** Build an analytics-safe route without authentication or invitation secrets. */
export const getAnalyticsPagePath = (pathname: string, search: string): string => {
  const params = new URLSearchParams(search);
  for (const key of SENSITIVE_QUERY_KEYS) params.delete(key);
  const safeSearch = params.toString();
  return `${pathname}${safeSearch ? `?${safeSearch}` : ''}`;
};
