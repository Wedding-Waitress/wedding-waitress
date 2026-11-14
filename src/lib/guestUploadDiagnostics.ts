export interface GuestUploadDiagnostic {
  at: string;
  revision: 'authorization-once-20261011';
  stage: 'checkpoint' | 'registering' | 'transferring' | 'finalizing' | 'complete';
  kind: 'photo' | 'video' | 'unknown';
  bytes: number;
  outcome: 'error' | 'done';
  status?: number;
  code?: string;
}

/** Explicit allowlist: never retain raw messages, filenames, URLs or credentials. */
export function uploadFailureDetails(error: any): { status?: number; code?: string } {
  let status: unknown;
  try { status = error?.originalResponse?.getStatus?.() ?? error?.status; } catch { /* no diagnostic failure affects uploads */ }
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,32}$/.test(error.code) ? error.code : undefined;
  return { status: typeof status === 'number' && status >= 100 && status <= 599 ? status : undefined, code };
}

export function recordUploadDiagnostic(details: Omit<GuestUploadDiagnostic, 'at' | 'revision'>) {
  const entry: GuestUploadDiagnostic = { at: new Date().toISOString(), revision: 'authorization-once-20261011', ...details };
  try {
    const key = 'ww-upload-diagnostics-v1';
    const previous = JSON.parse(sessionStorage.getItem(key) || '[]');
    sessionStorage.setItem(key, JSON.stringify([...(Array.isArray(previous) ? previous.slice(-29) : []), entry]));
  } catch { /* restricted storage must never prevent uploading */ }
  console.info('Guest upload diagnostic', entry);
}
