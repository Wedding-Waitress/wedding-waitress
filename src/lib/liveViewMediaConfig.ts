export type LiveViewMediaConfig = Record<string, unknown> | null | undefined;

const nonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

/**
 * `video_url` is the canonical Welcome Video key. Older direct uploads used
 * `file_url`, so reads keep that fallback until all saved event data has been
 * rewritten through the organiser controls.
 */
export const resolveWelcomeVideoUrl = (config: LiveViewMediaConfig): string | null =>
  nonEmptyString(config?.['video_url']) ?? nonEmptyString(config?.['file_url']);

export const withWelcomeVideoUrl = (
  config: LiveViewMediaConfig,
  videoUrl: string,
): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...(config ?? {}), video_url: videoUrl };
  delete next['file_url'];
  return next;
};
