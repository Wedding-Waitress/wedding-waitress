/** Verify the caller's current login session against the server's SMS proof. */
export async function hasRecentAdminVerification(client: { rpc: (name: string) => PromiseLike<{ data: unknown; error: unknown }> }): Promise<boolean> {
  try {
    const { data, error } = await client.rpc('admin_require_verified_session');
    return !error && data === true;
  } catch { return false; }
}
