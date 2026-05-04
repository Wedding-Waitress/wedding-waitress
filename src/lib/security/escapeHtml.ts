/**
 * Defense-in-depth HTML/XML escaping for chart and place-card exporters.
 *
 * These functions are used wherever user-provided data (guest names, table
 * names, captions, venue, partner names, dietary text, notes, etc.) is
 * interpolated into SVG or HTML strings that are later assigned via
 * `innerHTML` for off-screen html2canvas / jsPDF rendering.
 *
 * The off-screen surface is never displayed to other users, but escaping
 * eliminates the XSS class entirely and keeps exported PDFs/PNGs correct
 * even when names contain `&`, `<`, `>`, `"` or `'`.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape a string for safe inclusion as text inside HTML or SVG markup.
 * Returns an empty string for null/undefined input.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  return str.replace(/[&<>"']/g, (ch) => HTML_ENTITY_MAP[ch] || ch);
}

/**
 * Alias for escaping into SVG/XML attribute values or text content.
 * Same rules as HTML — kept as a separate name for caller clarity.
 */
export const escapeXml = escapeHtml;
