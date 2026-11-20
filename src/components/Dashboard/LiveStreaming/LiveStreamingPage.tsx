import React, { useEffect, useRef, useState } from "react";
import {
  Radio,
  Video,
  MonitorPlay,
  Download,
  Copy,
  Check,
  Clock3,
  CalendarDays,
  Users,
  LockKeyhole,
  Camera,
  Lightbulb,
  Mic,
  Pause,
  Play,
  Info,
  ArrowUpRight,
  Film,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PUBLIC_COUPLE_PLAN_DETAILS } from "@/components/Pricing/pricingPlans";
import {
  createPreviewStream,
  emptyStreamingPreview,
  formatStreamTime,
  pausePreviewBroadcast,
  readStreamingPreview,
  startPreviewBroadcast,
  STREAM_DOWNLOADS,
  STREAM_PACKAGES,
  STREAM_PREVIEW_KEY,
  streamPlan,
  streamUsage,
  type PreviewStreamPackage,
  type StreamingPreviewState,
  type StreamQuality,
  type StreamTier,
} from "@/lib/liveStreamingPreview";
import styles from "./LiveStreamingPage.module.css";

const dateTime = (n: number) =>
  new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(n);
const money = (n: number) => (n ? `A$${n}` : "Free");
const linkFor = (p: PreviewStreamPackage, role: "broadcaster" | "viewer") => {
  const url = new URL("/dev/live-streaming", window.location.origin);
  url.search = new URLSearchParams({
    view: role,
    package: p.id,
    token: role === "broadcaster" ? p.broadcasterToken : p.viewerToken,
  }).toString();
  return url.toString();
};
function CameraCheck({ quality }: { quality: StreamQuality }) {
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false),
    [error, setError] = useState("");
  useEffect(
    () => () => stream.current?.getTracks().forEach((t) => t.stop()),
    [],
  );
  async function start() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error(
          "Camera access needs a supported browser on HTTPS or localhost.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: quality === "1080p" ? 1920 : 1280 },
          height: { ideal: quality === "1080p" ? 1080 : 720 },
        },
        audio: true,
      });
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = media;
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
      setActive(true);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setActive(false);
      setError(
        e instanceof Error
          ? e.message
          : "Camera or microphone access is unavailable.",
      );
    }
  }
  return (
    <>
      <div className={styles.cameraBox}>
        <video
          ref={video}
          muted
          playsInline
          autoPlay
          aria-label="Local camera preview"
        />
        {!active && (
          <span>
            <Camera size={40} />
            Check your camera and microphone
          </span>
        )}
      </div>
      <button className={styles.secondary} onClick={start}>
        <Camera size={16} />
        Check camera & microphone
      </button>
      {error && <p role="alert">{error}</p>}
      <p className={styles.caption}>
        Camera stays on this device. No video is transmitted or recorded in this
        preview.
      </p>
    </>
  );
}
export function LiveStreamingPage({
  initialEventName = "",
}: {
  initialEventName?: string;
}) {
  const [state, setState] = useState<StreamingPreviewState>(() => {
    try {
      return readStreamingPreview(localStorage.getItem(STREAM_PREVIEW_KEY));
    } catch {
      return emptyStreamingPreview();
    }
  });
  const [storageError, setStorageError] = useState(false),
    [quality, setQuality] = useState<StreamQuality>("1080p");
  const [eventName, setEventName] = useState(initialEventName),
    [eventDate, setEventDate] = useState("");
  const [pending, setPending] = useState<StreamTier | null>(null),
    [agreed, setAgreed] = useState(false),
    [upgrade, setUpgrade] = useState(false);
  const [notice, setNotice] = useState(""),
    [now, setNow] = useState(Date.now()),
    [finished, setFinished] = useState(false);
  const [pricing, setPricing] = useState(false),
    [password, setPassword] = useState(""),
    [unlocked, setUnlocked] = useState(false),
    [passwordError, setPasswordError] = useState("");
  const params = new URLSearchParams(window.location.search),
    role = params.get("view"),
    isRole = role === "broadcaster" || role === "viewer";
  const selected = state.packages.find(
    (p) => p.id === (isRole ? params.get("package") : state.selectedId),
  );
  const usage = selected ? streamUsage(selected, now) : null;
  const running =
    !!selected &&
    selected.liveStartedAt !== null &&
    !usage?.expired &&
    !!usage?.remaining;
  const roleValid =
    !isRole ||
    (!!selected &&
      params.get("token") ===
        (role === "broadcaster"
          ? selected.broadcasterToken
          : selected.viewerToken));
  const update = (
    id: string,
    fn: (p: PreviewStreamPackage) => PreviewStreamPackage,
  ) =>
    setState((s) => ({
      ...s,
      packages: s.packages.map((p) => (p.id === id ? fn(p) : p)),
    }));
  useEffect(() => {
    try {
      localStorage.setItem(STREAM_PREVIEW_KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    const fn = (e: StorageEvent) => {
      if (e.key === STREAM_PREVIEW_KEY)
        setState(readStreamingPreview(e.newValue));
    };
    window.addEventListener("storage", fn);
    return () => window.removeEventListener("storage", fn);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (
      selected &&
      usage &&
      (usage.expired || usage.remaining === 0) &&
      selected.liveStartedAt !== null
    ) {
      update(selected.id, (p) => pausePreviewBroadcast(p, Date.now()));
      if (role !== "viewer") setFinished(true);
    }
  }, [selected, usage?.expired, usage?.remaining, role]);
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(
        "Preview link copied. It works only in this browser’s local preview.",
      );
    } catch {
      setNotice(
        "Copy is unavailable. Select and copy the link field manually.",
      );
    }
  }
  function activate() {
    if (
      !pending ||
      !agreed ||
      !eventName.trim() ||
      !eventDate ||
      (pending === "trial" && state.trialClaimed)
    )
      return;
    const p = createPreviewStream(
      pending,
      quality,
      eventName,
      eventDate,
      Date.now(),
    );
    setState((s) => ({
      version: 1,
      trialClaimed: s.trialClaimed || pending === "trial",
      packages: [...s.packages, p],
      selectedId: p.id,
    }));
    setPending(null);
    setPricing(false);
    setNotice(
      "Preview package added. No payment was taken and no live service was activated.",
    );
  }
  if (!import.meta.env.DEV) return null;
  return (
    <div className={styles.page} data-live-streaming-preview>
      <div className={styles.previewBanner}>
        <Info size={18} />
        <span>
          <strong>Local design preview.</strong> No payments, broadcasts or
          video files are created. AWS and Stripe will be connected after your
          review.
        </span>
      </div>
      {storageError && (
        <p role="alert">
          Browser storage is unavailable. Changes cannot be preserved after
          refresh.
        </p>
      )}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <Radio size={26} />
          </span>
          <div>
            <h1>Live Streaming</h1>
            <p>Bring everyone closer. Share the moment, keep the memory.</p>
          </div>
        </div>
        <div className={styles.headerMeta}>
          <span>
            <Users size={15} />
            Up to 100 viewers
          </span>
          <span>
            <Video size={15} />
            One broadcasting iPhone
          </span>
        </div>
      </header>
      {!isRole && (
        <nav className={styles.tabs} aria-label="Streaming preview views">
          <button
            aria-current={!pricing ? "page" : undefined}
            onClick={() => setPricing(false)}
          >
            My streaming
          </button>
          <button
            aria-current={pricing ? "page" : undefined}
            onClick={() => setPricing(true)}
          >
            Packages page preview
          </button>
        </nav>
      )}
      {notice && (
        <div className={styles.notice} role="status">
          <Check size={16} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {isRole ? (
        !selected || !roleValid ? (
          <section className={styles.panel}>
            <h2>Preview link unavailable</h2>
            <p>
              Open a link from a package in this browser’s organiser preview.
            </p>
            <a href="/dev/live-streaming">Return to organiser preview</a>
          </section>
        ) : (
          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>
                  {role === "broadcaster"
                    ? "Broadcaster preview"
                    : "Guest viewing preview"}
                </span>
                <h2>{selected.eventName}</h2>
                <p>
                  {selected.eventDate} · {selected.quality}
                </p>
              </div>
              <span className={styles.badge}>
                {usage?.expired
                  ? "Expired"
                  : running
                    ? "Preview broadcasting"
                    : "Not live"}
              </span>
            </div>
            {role === "viewer" ? (
              <>
                <div className={styles.videoPlaceholder}>
                  <MonitorPlay size={45} />
                  <h3>
                    {usage?.expired
                      ? "This streaming package has expired"
                      : running
                        ? "Live picture will appear here"
                        : "The broadcast has not started"}
                  </h3>
                  <p>
                    {running
                      ? "AWS is not connected in this local preview."
                      : "Keep this page open. The picture appears when the broadcaster goes live."}
                  </p>
                </div>
                <p>
                  Live viewing only. No replay, recording purchase or download
                  is available to guests.
                </p>
              </>
            ) : !unlocked ? (
              <form
                className={styles.unlock}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (password === "preview") {
                    setUnlocked(true);
                    setPasswordError("");
                  } else
                    setPasswordError(
                      "Use the local demonstration password: preview.",
                    );
                }}
              >
                <LockKeyhole size={30} />
                <h3>Ready to broadcast?</h3>
                <p>Enter the password supplied by the account holder.</p>
                <label>
                  Broadcaster password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <small>
                  Local demonstration password: <strong>preview</strong>. This
                  is not real authentication.
                </small>
                {passwordError && <p role="alert">{passwordError}</p>}
                <button className={styles.primary}>
                  Continue to broadcaster preview
                </button>
              </form>
            ) : (
              <>
                <CameraCheck quality={selected.quality} />
                <div className={styles.actions}>
                  <button
                    className={styles.primary}
                    disabled={usage?.expired || !usage?.remaining}
                    onClick={() =>
                      update(selected.id, (p) =>
                        running
                          ? pausePreviewBroadcast(p, Date.now())
                          : startPreviewBroadcast(p, Date.now()),
                      )
                    }
                  >
                    {running ? <Pause size={16} /> : <Play size={16} />}{" "}
                    {running ? "Pause preview broadcast" : "Simulate Go Live"}
                  </button>
                  <strong>
                    Time left: {formatStreamTime(usage?.remaining ?? 0)}
                  </strong>
                </div>
                <p className={styles.caption}>
                  Go Live is a timer simulation only. Keep the iPhone awake,
                  charged and on this page when using the future live service.
                </p>
              </>
            )}
            <a className={styles.backLink} href="/dev/live-streaming">
              ← Return to organiser preview
            </a>
          </section>
        )
      ) : (
        <>
          {pricing && (
            <section className={styles.panel}>
              <span className={styles.eyebrow}>
                Internal pricing layout preview
              </span>
              <h2>Choose what your event needs</h2>
              <p>
                Planning tools and Live Streaming are separate purchases. This
                English organiser preview does not change the public pricing
                page.
              </p>
              <div className={styles.packageGrid}>
                {Object.values(PUBLIC_COUPLE_PLAN_DETAILS).map((plan) => (
                  <article className={styles.planningCard} key={plan.name}>
                    <h3>{plan.name}</h3>
                    <strong>{money(plan.priceAud)}</strong>
                    <p>
                      Up to {plan.guests} guests · 12 months’ planning access.
                    </p>
                    <button
                      className={styles.secondary}
                      onClick={() => setUpgrade(true)}
                    >
                      Preview {plan.name}
                    </button>
                  </article>
                ))}
                <article className={styles.planningCard}>
                  <Radio size={25} />
                  <h3>Live Streaming</h3>
                  <strong>From A$300 + GST</strong>
                  <p>
                    Streaming, recording and downloads. Buy it on its own or
                    alongside planning tools.
                  </p>
                  <a className={styles.primary} href="#stream-packages">
                    Explore streaming packages
                  </a>
                </article>
              </div>
            </section>
          )}
          <section className={styles.panel} id="stream-packages">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>1 · Choose your package</span>
                <h2>Share it live. Keep the memory.</h2>
                <p>
                  Recording included. Download your keepsake before your package
                  expires.
                </p>
              </div>
              <fieldset className={styles.quality}>
                <legend>Owner quality comparison</legend>
                {(["720p", "1080p"] as const).map((q) => (
                  <button
                    key={q}
                    aria-pressed={quality === q}
                    onClick={() => setQuality(q)}
                  >
                    {q === "720p" ? "HD · 720p" : "Full HD · 1080p"}
                  </button>
                ))}
              </fieldset>
            </div>
            <p className={styles.caption}>
              Quality applies to live viewing, recording and download. Both
              modes are shown for private testing before launch.
            </p>
            <div className={styles.packageGrid}>
              {STREAM_PACKAGES.map((plan) => (
                <article
                  key={plan.id}
                  className={`${styles.packageCard} ${plan.id === "five" ? styles.featured : ""}`}
                >
                  {plan.id === "five" && (
                    <span className={styles.cardLabel}>
                      More time for your celebration
                    </span>
                  )}
                  <span className={styles.duration}>
                    {plan.id === "trial"
                      ? "Try it first"
                      : `Up to ${plan.seconds / 3600} hours`}
                  </span>
                  <h3>{plan.name}</h3>
                  <div className={styles.price}>
                    {money(plan.prices[quality])}
                    {plan.id !== "trial" && <small> + GST</small>}
                  </div>
                  <p>{plan.description}</p>
                  <ul>
                    <li>
                      <Check size={14} />
                      Up to 100 viewing devices
                    </li>
                    <li>
                      <Check size={14} />
                      Recording and download included
                    </li>
                    <li>
                      <Check size={14} />
                      {plan.id === "trial"
                        ? "One free test per account"
                        : "90 days from purchase"}
                    </li>
                    <li>
                      <Check size={14} />
                      {plan.id === "trial"
                        ? "10 minutes of actual broadcast time"
                        : "Pause and resume your allowance"}
                    </li>
                  </ul>
                  <button
                    className={
                      plan.id === "trial" ? styles.secondary : styles.primary
                    }
                    disabled={plan.id === "trial" && state.trialClaimed}
                    onClick={() => {
                      setPending(plan.id);
                      setAgreed(false);
                      if (selected) {
                        if (!eventName) setEventName(selected.eventName);
                        if (!eventDate) setEventDate(selected.eventDate);
                      }
                    }}
                  >
                    {plan.id === "trial"
                      ? state.trialClaimed
                        ? "Free test already selected"
                        : "Preview free test"
                      : "Preview this package"}
                  </button>
                </article>
              ))}
            </div>
            <div className={styles.ruleStrip}>
              <Info size={20} />
              <p>
                <strong>One purchase, everything included.</strong> Sessions
                join in order into one final recording, without the pauses. Paid
                packages include five account-holder downloads. Hours and
                recording access expire together 90 days after purchase. New
                purchases are separate packages, not extensions.
              </p>
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>
                  2 · Your streaming workspace
                </span>
                <h2>My packages & usage</h2>
              </div>
              {state.packages.length > 0 && (
                <label>
                  Selected package
                  <select
                    value={selected?.id ?? ""}
                    onChange={(e) =>
                      setState((s) => ({ ...s, selectedId: e.target.value }))
                    }
                  >
                    {state.packages.map((p, i) => (
                      <option key={p.id} value={p.id}>
                        {i + 1}. {p.eventName} · {streamPlan(p.tier).name} ·{" "}
                        {p.quality}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {!selected || !usage ? (
              <div className={styles.empty}>
                <Radio size={36} />
                <h3>Your event starts here</h3>
                <p>
                  Choose a preview package above to explore your countdown,
                  links and recording workspace.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.eventBar}>
                  <div>
                    <h3>{selected.eventName}</h3>
                    <p>
                      {selected.eventDate} · {streamPlan(selected.tier).name} ·{" "}
                      {selected.quality}
                    </p>
                  </div>
                  <span className={styles.badge}>
                    {usage.expired
                      ? "Package expired"
                      : !usage.remaining
                        ? "Broadcast allowance used"
                        : running
                          ? "Preview timer running"
                          : "Ready for preview"}
                  </span>
                </div>
                <div className={styles.stats}>
                  <div>
                    <CalendarDays />
                    <span>Start / purchase</span>
                    <strong>{dateTime(selected.purchasedAt)}</strong>
                    <small>Preview selection time</small>
                  </div>
                  <div>
                    <Clock3 />
                    <span>Time used</span>
                    <strong>{formatStreamTime(usage.used)}</strong>
                    <small>Only live broadcasting counts</small>
                  </div>
                  <div>
                    <Radio />
                    <span>Time remaining</span>
                    <strong data-testid="stream-time-remaining">
                      {formatStreamTime(usage.remaining)}
                    </strong>
                    <small>Of {formatStreamTime(usage.allowance)}</small>
                  </div>
                  <div>
                    <CalendarDays />
                    <span>Expiry</span>
                    <strong>
                      {selected.expiresAt
                        ? dateTime(selected.expiresAt)
                        : "One 10-minute test"}
                    </strong>
                    <small>
                      {selected.expiresAt
                        ? "Hours and downloads end together"
                        : "Trial calendar expiry not yet specified"}
                    </small>
                  </div>
                </div>
                <label className={styles.progressLabel}>
                  Broadcast allowance used{" "}
                  <strong>{Math.floor(usage.percent)}%</strong>
                  <progress value={usage.used} max={usage.allowance} />
                </label>
                {(usage.expired || !usage.remaining) && (
                  <p className={styles.expiryNotice}>
                    {selected.tier === "trial"
                      ? "Your free test has finished. Choose a paid package to continue streaming."
                      : usage.expired
                        ? "This package has expired. Choose a brand-new package to broadcast again."
                        : "All broadcasting hours are used. Your recording remains available until expiry; buy a new package for more streaming."}
                  </p>
                )}
                <div className={styles.linkGrid}>
                  {(["broadcaster", "viewer"] as const).map((r) => (
                    <article key={r} className={styles.linkCard}>
                      <div className={styles.inlineHeading}>
                        {r === "broadcaster" ? (
                          <Video size={22} />
                        ) : (
                          <MonitorPlay size={22} />
                        )}
                        <h3>
                          {r === "broadcaster"
                            ? "Broadcaster link"
                            : "Viewer link"}
                        </h3>
                      </div>
                      <p>
                        {r === "broadcaster"
                          ? "Give this private link to the person filming on an iPhone. Only one device broadcasts at a time."
                          : "Send this link by SMS, email or your preferred method. No login, password or code is needed."}
                      </p>
                      <label>
                        {r === "broadcaster"
                          ? "Camera link"
                          : "Live viewing link"}
                        <input
                          readOnly
                          value={linkFor(selected, r)}
                          onFocus={(e) => e.target.select()}
                        />
                      </label>
                      <div className={styles.actions}>
                        <button
                          className={styles.secondary}
                          onClick={() => copy(linkFor(selected, r))}
                        >
                          <Copy size={15} />
                          Copy preview link
                        </button>
                        <a
                          className={styles.primary}
                          href={linkFor(selected, r)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ArrowUpRight size={15} />
                          Open {r}
                        </a>
                      </div>
                      <small>
                        {r === "broadcaster"
                          ? "Preview password: preview. Production password protection and the one-device lock require the backend."
                          : "Live only · 100 devices · No replay or downloads. Enforcing the viewer cap requires the backend."}
                      </small>
                    </article>
                  ))}
                </div>
                <article className={styles.recording}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span className={styles.eyebrow}>
                        3 · Keep your recording
                      </span>
                      <h3>One combined recording</h3>
                      <p>
                        {selected.sessions.length} preview sessions ·{" "}
                        {formatStreamTime(selected.usedSeconds)} total ·{" "}
                        {selected.quality}
                      </p>
                    </div>
                    <span className={styles.badge}>
                      {STREAM_DOWNLOADS - selected.downloadsUsed} of 5 downloads
                      remaining
                    </span>
                  </div>
                  <p>
                    Sessions are joined chronologically, without the pauses.
                    Only the account holder can access this recording. Guests
                    cannot replay, download or purchase it.
                  </p>
                  <ol className={styles.sessionList}>
                    {selected.sessions.map((s, i) => (
                      <li key={`${s.startedAt}-${i}`}>
                        <Film size={15} />
                        <span>
                          Session {i + 1} · {dateTime(s.startedAt)}
                        </span>
                        <strong>{formatStreamTime(s.seconds)}</strong>
                      </li>
                    ))}
                  </ol>
                  <button className={styles.primary} disabled>
                    <Download size={17} />
                    Download combined video
                  </button>
                  <small>
                    A real video download becomes available after AWS recording
                    and processing are connected. This preview does not create a
                    video file.
                  </small>
                </article>
                <details className={styles.previewTools}>
                  <summary>Owner preview controls</summary>
                  <p>
                    Simulate the workflow without changing a real account or
                    recording video.
                  </p>
                  <div className={styles.actions}>
                    <button
                      className={styles.secondary}
                      disabled={usage.expired || !usage.remaining || running}
                      onClick={() =>
                        update(selected.id, (p) => {
                          const added = Math.min(
                            300,
                            streamUsage(p, Date.now()).remaining,
                          );
                          return {
                            ...p,
                            usedSeconds: p.usedSeconds + added,
                            sessions: [
                              ...p.sessions,
                              { startedAt: Date.now(), seconds: added },
                            ],
                          };
                        })
                      }
                    >
                      Simulate 5 minutes used
                    </button>
                    <button
                      className={styles.secondary}
                      disabled={usage.expired || !usage.remaining}
                      onClick={() => {
                        update(selected.id, (p) => ({
                          ...pausePreviewBroadcast(p, Date.now()),
                          usedSeconds: streamPlan(p.tier).seconds,
                        }));
                        setFinished(true);
                      }}
                    >
                      Simulate allowance finished
                    </button>
                    <button
                      className={styles.secondary}
                      disabled={selected.tier === "trial" || usage.expired}
                      onClick={() =>
                        update(selected.id, (p) => ({
                          ...pausePreviewBroadcast(p, Date.now()),
                          expiresAt: Date.now() - 1,
                        }))
                      }
                    >
                      Simulate package expiry
                    </button>
                    <button
                      className={styles.secondary}
                      disabled={
                        running ||
                        usage.expired ||
                        !selected.sessions.length ||
                        selected.downloadsUsed >= 5
                      }
                      onClick={() =>
                        update(selected.id, (p) => ({
                          ...p,
                          downloadsUsed: p.downloadsUsed + 1,
                        }))
                      }
                    >
                      Simulate completed download
                    </button>
                  </div>
                </details>
              </>
            )}
          </section>
          <section className={styles.panel}>
            <h2>From your iPhone to everyone you love</h2>
            <div className={styles.steps}>
              {[
                [
                  "1",
                  "Choose & share",
                  "Choose a package and enter your event details. Send the broadcaster link to the person filming and the viewer link to your guests.",
                ],
                [
                  "2",
                  "Go live",
                  "Open the camera link on an iPhone, enter the password and allow camera and microphone access. Tap Go Live. Pause whenever you need.",
                ],
                [
                  "3",
                  "Download your memory",
                  "Return here after broadcasting. Your sessions become one combined recording. Download it before the displayed expiry.",
                ],
              ].map(([n, title, text]) => (
                <article key={n}>
                  <span>{n}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>
          <section className={styles.panel}>
            <h2>Recommended tips</h2>
            <div className={styles.tips}>
              {[
                [
                  Camera,
                  "Keep it steady",
                  "Place the iPhone on a tripod. Film in landscape for a wider picture.",
                ],
                [
                  Lightbulb,
                  "Find good light",
                  "Light the subject from the front. Avoid bright windows or lights behind them.",
                ],
                [
                  Mic,
                  "Make every word clear",
                  "Consider a compatible external microphone. Test the actual recorded sound with your iPhone and browser first.",
                ],
                [
                  Radio,
                  "Test your connection",
                  "Use your free test at the venue. Compare reliable Wi-Fi and mobile coverage. Keep the phone charged and the browser open.",
                ],
              ].map(([Icon, title, text]) => {
                const TipIcon = Icon as typeof Camera;
                return (
                  <article key={String(title)}>
                    <TipIcon />
                    <h3>{String(title)}</h3>
                    <p>{String(text)}</p>
                  </article>
                );
              })}
            </div>
            <p className={styles.caption}>
              Quality and continuity depend on the device, lighting and
              connection. If interrupted, reopen the camera link and resume
              while the package is valid. A cloud recording cannot recover
              footage that never reached it.
            </p>
          </section>
          <section className={`${styles.panel} ${styles.upgradePanel}`}>
            <LockKeyhole size={27} />
            <div>
              <h2>Need the planning tools too?</h2>
              <p>
                Add Essential, Premium or Ultimate for 12 months of Wedding
                Waitress planning access. Live Streaming is a separate purchase.
              </p>
            </div>
            <button
              className={styles.secondary}
              onClick={() => setUpgrade(true)}
            >
              Explore planning packages
            </button>
          </section>
        </>
      )}
      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent className={styles.dialog}>
          <DialogHeader>
            <DialogTitle>
              {pending ? streamPlan(pending).name : "Choose a package"}
            </DialogTitle>
            <DialogDescription>
              Review the local preview setup. No payment will be taken.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              activate();
            }}
          >
            <label>
              Event name
              <input
                required
                maxLength={150}
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Hossam & Reema’s Wedding"
              />
            </label>
            <label>
              Event date
              <input
                required
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </label>
            <div className={styles.orderSummary}>
              <strong>
                {pending && money(streamPlan(pending).prices[quality])}
                {pending !== "trial" && " + GST"}
              </strong>
              <span>{quality} live, recording and download</span>
              <p>
                {pending === "trial"
                  ? "One free 10-minute test per account. Up to 100 viewing devices."
                  : "90 days from successful purchase. Only actual broadcasting uses your hours. All unused time and recording access expire together, including late recordings."}
              </p>
              <small>
                GST will be calculated at checkout when Stripe is connected. No
                checkout is created here.
              </small>
            </div>
            <label className={styles.acknowledgement}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I have permission to broadcast and record this event. I
                understand that viewers may independently capture or share the
                stream, and that picture and sound depend on the device and
                connection. My statutory consumer rights are unaffected.
              </span>
            </label>
            <small>
              Draft acknowledgement for review before launch. Unticked by
              default.
            </small>
            <div className={styles.actions}>
              <button
                className={styles.primary}
                disabled={
                  !agreed ||
                  !eventName.trim() ||
                  !eventDate ||
                  (pending === "trial" && state.trialClaimed)
                }
              >
                {pending === "trial"
                  ? "Add preview free test"
                  : "Add preview package"}
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={upgrade} onOpenChange={setUpgrade}>
        <DialogContent className={styles.dialog}>
          <DialogHeader>
            <DialogTitle>Add Wedding Waitress planning tools</DialogTitle>
            <DialogDescription>
              12 months’ planning access. Streaming remains separate. No payment
              is available in this preview.
            </DialogDescription>
          </DialogHeader>
          {Object.values(PUBLIC_COUPLE_PLAN_DETAILS).map((plan) => (
            <div className={styles.upgradeRow} key={plan.name}>
              <strong>{plan.name}</strong>
              <span>Up to {plan.guests} guests</span>
              <span>{money(plan.priceAud)}</span>
            </div>
          ))}
          <button className={styles.primary} onClick={() => setUpgrade(false)}>
            Return to streaming preview
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={finished} onOpenChange={setFinished}>
        <DialogContent className={styles.dialog}>
          <DialogHeader>
            <DialogTitle>
              {selected?.tier === "trial"
                ? "Your free test has finished"
                : "Your preview allowance has ended"}
            </DialogTitle>
            <DialogDescription>
              Choose a brand-new two-, five- or eight-hour package to continue.
              A new purchase does not extend the previous package.
            </DialogDescription>
          </DialogHeader>
          <button
            className={styles.primary}
            onClick={() => {
              setFinished(false);
              document
                .getElementById("stream-packages")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            View streaming packages
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
