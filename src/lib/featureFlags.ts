/**
 * Feature flags for Wedding Waitress
 * Use these to control experimental or unstable features
 */
export const flags = {
  // DJ Questionnaire - main feature
  djQuestionnaire: true,
  
  // Bulk import for songs - keep disabled until verified stable
  djBulkImport: false,
} as const;

export type FeatureFlags = typeof flags;
