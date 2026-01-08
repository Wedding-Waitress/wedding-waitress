/**
 * Feature flags for Wedding Waitress
 * Use these to control experimental or unstable features
 */
export const flags = {
  // Running Sheet - soft-disabled
  runningSheet: false,
} as const;

export type FeatureFlags = typeof flags;
