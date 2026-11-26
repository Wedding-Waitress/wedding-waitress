/// <reference lib="es2022.intl" />
/** Wrap whole words, falling back to grapheme boundaries for long unbroken text. */
export function wrapGuestbookText(text: string, width: number, measure: (s: string) => number): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return text.replace(/\r\n?/g, '\n').split('\n').flatMap(paragraph => {
    if (!paragraph) return [''];
    const lines: string[] = [];
    let line = '';
    for (const token of paragraph.match(/\S+|[^\S\n]+/gu) || []) {
      if (measure(line + token) <= width) { line += token; continue; }
      if (line.trim()) { lines.push(line.trimEnd()); line = ''; }
      if (!token.trim()) continue;
      for (const { segment } of segmenter.segment(token)) {
        if (line && measure(line + segment) > width) { lines.push(line); line = ''; }
        line += segment;
      }
    }
    if (line || !lines.length) lines.push(line.trimEnd());
    return lines;
  });
}

export function guestbookEventDate(value?: string | null): string {
  if (!value) return '';
  // Parse date-only values locally, avoiding the UTC day shift in western time zones.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });
}

