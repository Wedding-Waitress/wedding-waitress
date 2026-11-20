import { describe, expect, it } from "vitest";
import {
  createPreviewStream,
  startPreviewBroadcast,
  pausePreviewBroadcast,
  streamUsage,
  STREAM_WINDOW_MS,
  STREAM_PACKAGES,
  readStreamingPreview,
  formatStreamTime,
} from "./liveStreamingPreview";
const now = Date.UTC(2026, 10, 20, 8);
const make = () =>
  createPreviewStream("five", "1080p", "Celebration", "2026-12-12", now);
describe("local streaming preview rules", () => {
  it("uses the final agreed ex-GST prices", () =>
    expect(STREAM_PACKAGES.map((p) => p.prices)).toEqual([
      { "720p": 0, "1080p": 0 },
      { "720p": 300, "1080p": 400 },
      { "720p": 400, "1080p": 500 },
      { "720p": 500, "1080p": 600 },
    ]));
  it("starts the exact 90-day clock at purchase", () => {
    const p = make();
    expect(p.expiresAt).toBe(now + STREAM_WINDOW_MS);
    expect(streamUsage(p, now + STREAM_WINDOW_MS).expired).toBe(true);
    expect(startPreviewBroadcast(p, now + STREAM_WINDOW_MS)).toBe(p);
  });
  it("excludes pauses and combines session durations chronologically", () => {
    let p = startPreviewBroadcast(make(), now);
    p = pausePreviewBroadcast(p, now + 300000);
    expect(streamUsage(p, now + 86400000).used).toBe(300);
    p = startPreviewBroadcast(p, now + 86400000);
    p = pausePreviewBroadcast(p, now + 86460000);
    expect(p.sessions.map((s) => s.seconds)).toEqual([300, 60]);
    expect(p.usedSeconds).toBe(360);
  });
  it("caps trial usage at ten minutes and cannot restart it", () => {
    let p = startPreviewBroadcast(
      createPreviewStream("trial", "720p", "Test", "", now),
      now,
    );
    p = pausePreviewBroadcast(p, now + 900000);
    expect(p.usedSeconds).toBe(600);
    expect(streamUsage(p, now + 900000).remaining).toBe(0);
    expect(startPreviewBroadcast(p, now + 900000)).toBe(p);
  });
  it("does not consume broadcasting time after expiry", () => {
    const p = startPreviewBroadcast(make(), now + STREAM_WINDOW_MS - 10000);
    expect(streamUsage(p, now + STREAM_WINDOW_MS + 100000).used).toBe(10);
  });
  it("preserves running usage after reload and rejects duplicate starts", () => {
    const p = startPreviewBroadcast(make(), now);
    const loaded = readStreamingPreview(
      JSON.stringify({
        version: 1,
        trialClaimed: false,
        selectedId: p.id,
        packages: [p],
      }),
    );
    expect(streamUsage(loaded.packages[0], now + 7000).used).toBe(7);
    expect(startPreviewBroadcast(p, now + 1000)).toBe(p);
  });
  it("keeps purchases, recordings and role tokens separate", () => {
    const a = make(),
      b = make();
    expect(a.id).not.toBe(b.id);
    expect(a.broadcasterToken).not.toBe(a.viewerToken);
    expect(b.sessions).toEqual([]);
    expect(b.downloadsUsed).toBe(0);
  });
  it("rejects corrupt storage and preserves a claimed trial", () => {
    expect(readStreamingPreview("{").packages).toEqual([]);
    const p = createPreviewStream("trial", "720p", "Test", "", now);
    expect(
      readStreamingPreview(
        JSON.stringify({
          version: 1,
          trialClaimed: false,
          selectedId: p.id,
          packages: [p],
        }),
      ).trialClaimed,
    ).toBe(true);
  });
  it("formats hours without rounding away seconds", () =>
    expect(formatStreamTime(18001)).toBe("05:00:01"));
});
