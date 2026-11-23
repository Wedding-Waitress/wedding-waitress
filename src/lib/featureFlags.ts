/**
 * Feature flags for Wedding Waitress
 * Use these to control experimental or unstable features
 */
// Archived by the owner on 23 November 2026. Preserve the preview and its data.
// Restore only when the owner resumes this feature; see docs/LIVE_STREAMING_PREVIEW_20261120.md.
export const flags = { liveStreamingPreview: false } as const;

export type FeatureFlags = typeof flags;
