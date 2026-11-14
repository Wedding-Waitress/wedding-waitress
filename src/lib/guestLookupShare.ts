/** Shared seating links never carry the recipient's editing token. */
export async function shareGuestLookup(title: string, currentUrl: string) {
  const url = new URL(currentUrl);
  url.search = '';
  url.hash = '';
  if (navigator.share) {
    await navigator.share({ title, url: url.href });
    return 'shared' as const;
  }
  if (!navigator.clipboard?.writeText) throw new Error('Sharing is unavailable');
  await navigator.clipboard.writeText(url.href);
  return 'copied' as const;
}
