/** Use the direct Storage route only for standard hosted Supabase projects. */
export function resumableUploadEndpoint(projectUrl: string): string {
  const url = new URL(projectUrl);
  if (/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname)) {
    url.hostname = url.hostname.replace('.supabase.co', '.storage.supabase.co');
  }
  return `${url.origin}/storage/v1/upload/resumable`;
}
