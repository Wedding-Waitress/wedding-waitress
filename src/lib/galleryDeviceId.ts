// Opaque,随机 browser/device identifier for gallery rate limiting.
// Supplementary only — it can be reset by the guest, which is why the
// server also enforces a per-IP threshold.
const KEY = 'ww-gallery-device-id';

export function getGalleryDeviceId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    // Private mode / storage blocked: fall back to a per-session value.
    return 'ephemeral-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
