/**
 * Share-token normalization for vendor public views (DJ-MC, Running Sheet,
 * Seating Chart). Tokens are base64url strings stored without padding in the
 * DB but URLs sometimes URL-encode the trailing `=` characters, or callers
 * pad/strip differently. This helper produces both a "lookup" form (no
 * padding) and the original raw form so RPCs and realtime comparisons stay
 * consistent without fragile string concatenation hacks.
 */
export const decodeShareToken = (raw: string | undefined | null): string => {
  if (!raw) return "";
  let t = raw.trim();
  // URL decode first (handles %3D etc.).
  try { t = decodeURIComponent(t); } catch { /* leave as-is */ }
  // Strip any trailing '=' padding — RPCs match on the unpadded form.
  return t.replace(/=+$/g, "");
};

/**
 * Returns true if two share-token strings refer to the same underlying token,
 * tolerant to URL encoding and `=` padding differences.
 */
export const sameShareToken = (a: string | undefined | null, b: string | undefined | null): boolean => {
  if (!a || !b) return false;
  return decodeShareToken(a) === decodeShareToken(b);
};
