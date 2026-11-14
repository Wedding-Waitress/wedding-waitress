export const VIDEO_WISHES_MAX_SECONDS = 120;
export const VIDEO_WISHES_MAX_BYTES = 100 * 1024 * 1024;
export const VIDEO_WISHES_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];

export function recordingMime(recorder: typeof MediaRecorder): string | undefined {
  return ['video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'].find(mime => recorder.isTypeSupported(mime));
}

/** Owns every track and timer, including camera permission resolving after unmount. */
export class VideoWishesRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  constructor(private callbacks: {
    preview: (stream: MediaStream) => void;
    elapsed: (seconds: number) => void;
    recorded: (blob: Blob) => void;
    error: (message: string) => void;
  }, private maxSeconds=VIDEO_WISHES_MAX_SECONDS, private maxBytes=VIDEO_WISHES_MAX_BYTES) {}

  async open() {
    this.cancel();
    const generation = this.generation;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.callbacks.error('Recording is unavailable in this browser. You can still upload a video.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      this.callbacks.preview(stream);
    } catch {
      if (generation === this.generation) this.callbacks.error('Camera or microphone access was unavailable. You can still upload a video.');
    }
  }

  start() {
    if (!this.stream || this.recorder) return;
    const generation = this.generation;
    const chunks: BlobPart[] = [];
    let bytes = 0;
    let tooLarge = false;
    try {
      const mimeType = recordingMime(MediaRecorder);
      const recorder = new MediaRecorder(this.stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 4_000_000, audioBitsPerSecond: 128_000 });
      this.recorder = recorder;
      recorder.ondataavailable = event => {
        bytes += event.data.size;
        if (bytes > this.maxBytes) { tooLarge = true; this.stop(); }
        else if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (generation !== this.generation) return;
        this.release();
        this.recorder = null;
        if (tooLarge) this.callbacks.error('The recording exceeded 100 MB. Please record again or upload a smaller video.');
        else if (!bytes) this.callbacks.error('No video was recorded. Please try again.');
        else this.callbacks.recorded(new Blob(chunks, { type: recorder.mimeType.split(';')[0] || 'video/webm' }));
      };
      recorder.onerror = () => { this.cancel(); this.callbacks.error('Recording failed. Please try again or upload a video.'); };
      const started = performance.now();
      recorder.start(250);
      this.callbacks.elapsed(0);
      this.timer = setInterval(() => {
        const seconds = Math.min(this.maxSeconds, Math.floor((performance.now() - started) / 1000));
        this.callbacks.elapsed(seconds);
        if (seconds >= this.maxSeconds) this.stop();
      }, 200);
      this.stopTimer = setTimeout(() => this.stop(), this.maxSeconds * 1000);
    } catch {
      this.cancel();
      this.callbacks.error('Recording could not start. You can still upload a video.');
    }
  }

  stop() {
    this.clearTimers();
    if (this.recorder?.state !== 'inactive') this.recorder?.stop();
    this.release();
  }
  cancel() {
    ++this.generation;
    this.stop();
    this.recorder = null;
  }
  private clearTimers() {
    if (this.timer) clearInterval(this.timer);
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.timer = this.stopTimer = null;
  }
  private release() {
    this.clearTimers();
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
  }
}
