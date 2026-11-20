/** Local design preview only. This model never grants production entitlements. */
export type StreamQuality = "720p" | "1080p";
export type StreamTier = "trial" | "two" | "five" | "eight";
export const STREAM_PACKAGES = [
  {
    id: "trial",
    name: "10-Minute Free Test",
    seconds: 600,
    description:
      "Test your camera, sound and recording workflow before choosing a paid package.",
    prices: { "720p": 0, "1080p": 0 },
  },
  {
    id: "two",
    name: "2-Hour Live Streaming",
    seconds: 7200,
    description:
      "Share the key moments with up to two hours of live streaming, recording included.",
    prices: { "720p": 300, "1080p": 400 },
  },
  {
    id: "five",
    name: "5-Hour Live Streaming",
    seconds: 18000,
    description:
      "Capture more of your celebration with up to five hours of live streaming, recording included.",
    prices: { "720p": 400, "1080p": 500 },
  },
  {
    id: "eight",
    name: "8-Hour Live Streaming",
    seconds: 28800,
    description:
      "Share a longer event with up to eight hours of live streaming, recording included.",
    prices: { "720p": 500, "1080p": 600 },
  },
] as const;
export const STREAM_WINDOW_MS = 90 * 86400000;
export const STREAM_DOWNLOADS = 5;
export const STREAM_VIEWERS = 100;
export const STREAM_PREVIEW_KEY = "ww:live-streaming-design-preview:v1";
export interface PreviewStreamSession {
  startedAt: number;
  seconds: number;
}
export interface PreviewStreamPackage {
  id: string;
  tier: StreamTier;
  quality: StreamQuality;
  eventName: string;
  eventDate: string;
  purchasedAt: number;
  expiresAt: number | null;
  usedSeconds: number;
  liveStartedAt: number | null;
  downloadsUsed: number;
  sessions: PreviewStreamSession[];
  broadcasterToken: string;
  viewerToken: string;
}
export interface StreamingPreviewState {
  version: 1;
  trialClaimed: boolean;
  packages: PreviewStreamPackage[];
  selectedId: string | null;
}
export const emptyStreamingPreview = (): StreamingPreviewState => ({
  version: 1,
  trialClaimed: false,
  packages: [],
  selectedId: null,
});
export const streamPlan = (tier: StreamTier) =>
  STREAM_PACKAGES.find((p) => p.id === tier)!;
export function createPreviewStream(
  tier: StreamTier,
  quality: StreamQuality,
  eventName: string,
  eventDate: string,
  now: number,
): PreviewStreamPackage {
  return {
    id: crypto.randomUUID(),
    tier,
    quality,
    eventName: eventName.trim(),
    eventDate,
    purchasedAt: now,
    expiresAt: tier === "trial" ? null : now + STREAM_WINDOW_MS,
    usedSeconds: 0,
    liveStartedAt: null,
    downloadsUsed: 0,
    sessions: [],
    broadcasterToken: crypto.randomUUID(),
    viewerToken: crypto.randomUUID(),
  };
}
export function streamUsage(p: PreviewStreamPackage, now: number) {
  const allowance = streamPlan(p.tier).seconds;
  const end = Math.min(now, p.expiresAt ?? now);
  const liveSeconds =
    p.liveStartedAt === null
      ? 0
      : Math.max(0, Math.floor((end - p.liveStartedAt) / 1000));
  const used = Math.min(allowance, p.usedSeconds + liveSeconds);
  return {
    allowance,
    used,
    remaining: Math.max(0, allowance - used),
    expired: p.expiresAt !== null && now >= p.expiresAt,
    percent: Math.min(100, (used / allowance) * 100),
  };
}
export function startPreviewBroadcast(p: PreviewStreamPackage, now: number) {
  const usage = streamUsage(p, now);
  return usage.expired || usage.remaining === 0 || p.liveStartedAt !== null
    ? p
    : { ...p, liveStartedAt: now };
}
export function pausePreviewBroadcast(
  p: PreviewStreamPackage,
  now: number,
): PreviewStreamPackage {
  if (p.liveStartedAt === null) return p;
  const used = streamUsage(p, now).used,
    seconds = used - p.usedSeconds;
  return {
    ...p,
    usedSeconds: used,
    liveStartedAt: null,
    sessions:
      seconds > 0
        ? [...p.sessions, { startedAt: p.liveStartedAt, seconds }]
        : p.sessions,
  };
}
export const formatStreamTime = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
};
export function readStreamingPreview(
  value: string | null,
): StreamingPreviewState {
  if (!value) return emptyStreamingPreview();
  try {
    const data = JSON.parse(value);
    if (
      data.version !== 1 ||
      !Array.isArray(data.packages) ||
      typeof data.trialClaimed !== "boolean"
    )
      return emptyStreamingPreview();
    const packages = data.packages.filter(
      (p: PreviewStreamPackage) =>
        p &&
        typeof p.id === "string" &&
        typeof p.eventName === "string" &&
        typeof p.eventDate === "string" &&
        STREAM_PACKAGES.some((plan) => plan.id === p.tier) &&
        ["720p", "1080p"].includes(p.quality) &&
        Number.isFinite(p.purchasedAt) &&
        (p.expiresAt === null || Number.isFinite(p.expiresAt)) &&
        Number.isFinite(p.usedSeconds) &&
        p.usedSeconds >= 0 &&
        (p.liveStartedAt === null || Number.isFinite(p.liveStartedAt)) &&
        Array.isArray(p.sessions) &&
        p.sessions.every(
          (s) =>
            s &&
            Number.isFinite(s.startedAt) &&
            Number.isFinite(s.seconds) &&
            s.seconds >= 0,
        ) &&
        Number.isInteger(p.downloadsUsed) &&
        p.downloadsUsed >= 0 &&
        p.downloadsUsed <= STREAM_DOWNLOADS &&
        typeof p.broadcasterToken === "string" &&
        typeof p.viewerToken === "string",
    );
    return {
      version: 1,
      trialClaimed:
        data.trialClaimed ||
        packages.some((p: PreviewStreamPackage) => p.tier === "trial"),
      packages,
      selectedId: packages.some(
        (p: PreviewStreamPackage) => p.id === data.selectedId,
      )
        ? data.selectedId
        : (packages[0]?.id ?? null),
    };
  } catch {
    return emptyStreamingPreview();
  }
}
