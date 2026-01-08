/**
 * Feature flags for Wedding Waitress
 * Use these to control experimental or unstable features
 */
export const flags = {
  // DJ & MC Questionnaire - enabled
  djQuestionnaire: true,
  
  // Bulk import for songs - keep disabled until verified stable
  djBulkImport: false,
  
  // Running Sheet - soft-disabled
  runningSheet: false,
} as const;

export type FeatureFlags = typeof flags;
