export interface GuestUploadCheckpoint {
  requestId: string;
  secret: string;
  storageKey?: string;
  registration?: { item_id: string; storage_path: string; upload_token: string; upload_token_expires_at?: string; already_uploaded?: boolean };
  transferred?: boolean;
  done?: boolean;
}

function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Credentials remain in this tab's storage; diagnostics never include them. */
export async function guestUploadCheckpoint(file: File, scope: string): Promise<GuestUploadCheckpoint> {
  let key: string | undefined;
  try {
    const identity = JSON.stringify([scope, file.name, file.size, file.type, file.lastModified]);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
    key = `ww-media-upload:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const value = JSON.parse(saved) as GuestUploadCheckpoint;
      if (/^[0-9a-f-]{36}$/.test(value.requestId) && /^[0-9a-f]{64}$/.test(value.secret)) {
        return { ...value, storageKey: key };
      }
    }
  } catch { /* Storage restrictions never block a valid in-tab upload. */ }
  const hex = randomHex(16);
  const state: GuestUploadCheckpoint = {
    requestId: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`,
    secret: randomHex(32), storageKey: key,
  };
  saveGuestUploadCheckpoint(state);
  return state;
}

export function saveGuestUploadCheckpoint(state: GuestUploadCheckpoint) {
  try { if (state.storageKey) sessionStorage.setItem(state.storageKey, JSON.stringify(state)); } catch { /* in-memory recovery remains available */ }
}

export function clearGuestUploadCheckpoint(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* no upload is cancelled */ }
}
