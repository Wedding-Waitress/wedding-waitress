/** Only clean up uploads owned by this event after its saved reference changes. */
export function retiredLiveViewAsset(previousUrl: unknown, nextUrl: unknown, remainingUrls: unknown[], eventId: string, supabaseUrl: string) {
  if (typeof previousUrl !== 'string' || previousUrl === nextUrl || remainingUrls.includes(previousUrl)) return null;
  try {
    const url = new URL(previousUrl);
    if (url.origin !== new URL(supabaseUrl).origin) return null;
    const prefix = '/storage/v1/object/public/';
    if (!url.pathname.startsWith(prefix)) return null;
    const [bucket, owner, event, ...rest] = url.pathname.slice(prefix.length).split('/').map(decodeURIComponent);
    if ([bucket, owner, event, ...rest].some(part => !part || part === '.' || part === '..' || /[/\\]/.test(part))) return null;
    if (!['invitations', 'live-view-uploads'].includes(bucket) || !owner || event !== eventId || !rest.length) return null;
    return { bucket, path: [owner, event, ...rest].join('/') };
  } catch { return null; }
}
