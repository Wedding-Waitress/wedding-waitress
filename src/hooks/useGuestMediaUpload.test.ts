import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const backend = vi.hoisted(() => ({ rpc: vi.fn(), session: vi.fn(), transfers: vi.fn(), fingerprints: [] as string[], previous: [] as any[], resumed: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://example.invalid', SUPABASE_PUBLISHABLE_KEY: 'test',
  supabase: { rpc: backend.rpc, auth: { getSession: backend.session } },
}));
vi.mock('tus-js-client', () => ({ defaultOptions: { onShouldRetry: () => true }, Upload: class {
  constructor(public file: File, public options: any) {}
  async findPreviousUploads() { backend.fingerprints.push(await this.options.fingerprint()); return backend.previous; }
  resumeFromPreviousUpload(previous: any) { backend.resumed(previous); }
  start() {
    try {
      const transfer = backend.transfers(this.file, this.options);
      Promise.resolve(transfer).then(() => this.options.onSuccess(), error => this.options.onError(error));
    }
    catch (error) { this.options.onError(error); }
  }
} }));
import { useGuestMediaUpload, type UploadOptions } from './useGuestMediaUpload';
import type { ValidationResult } from '@/lib/mediaValidation';
import { webcrypto } from 'node:crypto';
// Actual browser HTTP adapter: repeated setRequestHeader calls append in XHR.
import XHRHttpStack from 'tus-js-client/lib/browser/httpStack.js';
const file = (name: string) => ({ file: new File(['data'], name), fileName: name, ok: true, kind: 'photo', mime: 'image/jpeg', size: 4 }) as ValidationResult;
const options = { token: 'event-a', uploaderName: 'Guest', limits: {} } as UploadOptions;

describe('guest batch recovery', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
    vi.spyOn(console, 'info').mockImplementation(() => {});
    sessionStorage.clear();
    backend.rpc.mockReset(); backend.transfers.mockReset(); backend.fingerprints.length = 0;
    backend.previous = []; backend.resumed.mockReset();
    backend.session.mockReset().mockResolvedValue({ data: {} });
    let seq = 0;
    const registrations = new Map<string, any>();
    backend.rpc.mockImplementation(async (name: string, args?: any) => {
      if (name === 'register_event_media_upload_v2') {
        let row = registrations.get(args._request_id);
        if (!row) {
          row = { item_id: `item-${++seq}`, storage_path: `object-${seq}`, upload_token: args._upload_secret, already_uploaded: false };
          registrations.set(args._request_id, row);
        }
        return { data: [{ ...row }] };
      }
      if (name === 'finalize_event_media_upload' && args) {
        for (const row of registrations.values()) if (row.item_id === args._item_id) row.already_uploaded = true;
      }
      return { data: true };
    });
  });
  it('retries a failed transfer without registering again or repeating successful files', async () => {
    const files = [file('first.jpg'), file('second.jpg')];
    backend.transfers.mockImplementationOnce(() => {}).mockImplementationOnce(() => { throw new Error('private backend detail'); });
    const { result } = renderHook(() => useGuestMediaUpload());
    await act(() => result.current.uploadFiles(files, options));
    expect(result.current.progress.map(p => p.status)).toEqual(['done', 'error']);
    expect(result.current.progress[1].error).not.toContain('private');
    await act(() => result.current.uploadFiles(files, options));
    expect(result.current.progress.map(p => p.status)).toEqual(['done', 'done']);
    const registrations = backend.rpc.mock.calls.filter(([name]) => name === 'register_event_media_upload_v2');
    expect(registrations).toHaveLength(3);
    expect(new Set(registrations.map(([, args]) => args._request_id)).size).toBe(2);
    expect(backend.transfers).toHaveBeenCalledTimes(3);
    expect(backend.fingerprints).toEqual(['event-media:object-1', 'event-media:object-2', 'event-media:object-2']);
  });
  it('retries finalisation alone and does not mark a transferred object failed', async () => {
    const files = [file('first.jpg')];
    const normal = backend.rpc.getMockImplementation()!;
    let failed = false;
    backend.rpc.mockImplementation(async (name: string, args: any) => {
      if (name === 'finalize_event_media_upload' && !failed) { failed = true; return { error: { message: 'database timeout' } }; }
      return normal(name, args);
    });
    const { result } = renderHook(() => useGuestMediaUpload());
    await act(() => result.current.uploadFiles(files, options));
    await act(() => result.current.uploadFiles(files, options));
    expect(backend.transfers).toHaveBeenCalledTimes(1);
    expect(backend.rpc.mock.calls.map(([name]) => name)).toEqual(['register_event_media_upload_v2', 'finalize_event_media_upload', 'register_event_media_upload_v2', 'finalize_event_media_upload']);
    expect(result.current.progress[0].status).toBe('done');
  });
  it('recovers a lost registration response using the same reservation', async () => {
    const normal = backend.rpc.getMockImplementation()!;
    let lost = false;
    backend.rpc.mockImplementation(async (name: string, args: any) => {
      const response = await normal(name, args);
      if (name === 'register_event_media_upload_v2' && !lost) { lost = true; return { error: { message: 'lost response' } }; }
      return response;
    });
    const files = [file('lost.jpg')];
    const first = renderHook(() => useGuestMediaUpload());
    await act(() => first.result.current.uploadFiles(files, options));
    first.unmount();
    const second = renderHook(() => useGuestMediaUpload());
    await act(() => second.result.current.uploadFiles(files, options));
    const calls = backend.rpc.mock.calls.filter(([name]) => name === 'register_event_media_upload_v2');
    expect(calls[0][1]._request_id).toBe(calls[1][1]._request_id);
    expect(backend.fingerprints).toEqual(['event-media:object-1']);
    expect(second.result.current.progress[0].status).toBe('done');
  });
  it('resumes an interrupted transfer after remount with the persisted object and TUS offset', async () => {
    const files = [file('interrupted.mov')];
    backend.transfers.mockRejectedValueOnce(new Error('connection interrupted'));
    const first = renderHook(() => useGuestMediaUpload());
    await act(() => first.result.current.uploadFiles(files, options));
    first.unmount();
    backend.previous = [{ uploadUrl: 'https://test.invalid/resumable/opaque' }];
    const second = renderHook(() => useGuestMediaUpload());
    await act(() => second.result.current.uploadFiles(files, options));
    expect(backend.resumed).toHaveBeenCalledWith(backend.previous[0]);
    expect(backend.fingerprints).toEqual(['event-media:object-1', 'event-media:object-1']);
    expect(second.result.current.progress[0].status).toBe('done');
  });
  it('acknowledges lost finalisation responses without repeating the transfer or finalisation', async () => {
    const normal = backend.rpc.getMockImplementation()!;
    backend.rpc.mockImplementation(async (name: string, args: any) => {
      const response = await normal(name, args);
      return name === 'finalize_event_media_upload' ? { error: { message: 'response lost after commit' } } : response;
    });
    const { result } = renderHook(() => useGuestMediaUpload());
    const files = [file('committed.jpg')];
    await act(() => result.current.uploadFiles(files, options));
    await act(() => result.current.uploadFiles(files, options));
    expect(backend.transfers).toHaveBeenCalledTimes(1);
    expect(backend.rpc.mock.calls.filter(([name]) => name === 'finalize_event_media_upload')).toHaveLength(1);
    expect(result.current.progress[0].status).toBe('done');
  });
  it('does not transfer when scope validation fails and can retry without leaking backend errors', async () => {
    const normal = backend.rpc.getMockImplementation()!;
    backend.rpc.mockResolvedValueOnce({ error: { message: 'revoked private token' } });
    const { result } = renderHook(() => useGuestMediaUpload());
    const files = [file('denied.jpg')];
    await act(() => result.current.uploadFiles(files, options));
    expect(backend.transfers).not.toHaveBeenCalled();
    expect(result.current.progress[0].error).not.toContain('private');
    backend.rpc.mockImplementation(normal);
    await act(() => result.current.uploadFiles(files, options));
    expect(result.current.progress[0].status).toBe('done');
  });
  it('finishes a simulated twenty-minute transfer and rejects reset while uploading', async () => {
    vi.useFakeTimers();
    backend.transfers.mockImplementation((_file: File, config: any) => new Promise<void>(resolve => setTimeout(() => { config.onProgress(100, 100); resolve(); }, 20 * 60 * 1000)));
    const { result } = renderHook(() => useGuestMediaUpload());
    let batch!: Promise<void>;
    await act(async () => { batch = result.current.uploadFiles([file('slow.mov')], options); });
    await act(async () => { await vi.advanceTimersByTimeAsync(16 * 60 * 1000); result.current.reset(); });
    expect(result.current.uploading).toBe(true);
    expect(result.current.progress[0].status).toBe('uploading');
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60 * 1000); await batch; });
    expect(result.current.progress[0].status).toBe('done');
  });
  it('uses the current session for subsequent chunks and recovers session refresh failures', async () => {
    backend.session.mockResolvedValueOnce({ error: new Error('refresh temporarily failed') });
    backend.transfers.mockImplementation(async (_file: File, config: any) => {
      const request = { setHeader: vi.fn(), getMethod: () => 'PATCH' };
      await config.onBeforeRequest(request);
      expect(request.setHeader).toHaveBeenCalledWith('authorization', 'Bearer renewed-test-session');
    });
    const { result } = renderHook(() => useGuestMediaUpload());
    const files = [file('session.jpg')];
    await act(() => result.current.uploadFiles(files, options));
    expect(result.current.progress[0].status).toBe('error');
    backend.session.mockResolvedValue({ data: { session: { access_token: 'renewed-test-session' } } });
    await act(() => result.current.uploadFiles(files, options));
    expect(backend.fingerprints).toEqual(['event-media:object-1', 'event-media:object-1']);
    expect(result.current.progress[0].status).toBe('done');
  });
  it('sets exactly one bearer header with the real browser adapter for creation, resume and renewed chunks', async () => {
    const captured: Record<string, string>[] = [];
    vi.stubGlobal('XMLHttpRequest', class {
      headers: Record<string, string> = {};
      open() { captured.push(this.headers); }
      setRequestHeader(name: string, value: string) {
        const key = name.toLowerCase();
        this.headers[key] = this.headers[key] ? `${this.headers[key]}, ${value}` : value;
      }
    });
    const stack = new XHRHttpStack();
    const old = stack.createRequest('POST', 'https://test.invalid');
    old.setHeader('authorization', 'Bearer example');
    old.setHeader('authorization', 'Bearer example');
    expect(captured[0].authorization).toBe('Bearer example, Bearer example');
    backend.transfers.mockImplementation(async (_file: File, config: any) => {
      for (const [index, method] of ['POST', 'HEAD', 'PATCH'].entries()) {
        backend.session.mockResolvedValue({ data: { session: { access_token: `current-${index}` } } });
        const request = stack.createRequest(method, 'https://test.invalid');
        for (const [key, value] of Object.entries(config.headers)) request.setHeader(key, value);
        await config.onBeforeRequest(request);
        expect(captured.at(-1)?.authorization).toBe(`Bearer current-${index}`);
      }
    });
    const { result } = renderHook(() => useGuestMediaUpload());
    await act(() => result.current.uploadFiles([file('headers.jpg')], options));
    expect(result.current.progress[0].status).toBe('done');
  });
  it('does not reuse another event registration and rejects concurrent submissions', async () => {
    const files = [file('first.jpg')];
    const { result } = renderHook(() => useGuestMediaUpload());
    await act(async () => { await Promise.all([result.current.uploadFiles(files, options), result.current.uploadFiles(files, options)]); });
    expect(backend.transfers).toHaveBeenCalledTimes(1);
    await act(() => result.current.uploadFiles(files, { ...options, token: 'event-b' }));
    expect(backend.transfers).toHaveBeenCalledTimes(2);
    expect(backend.fingerprints).toEqual(['event-media:object-1', 'event-media:object-2']);
  });
  it('a large video does not block photos and never runs more than two transfers', async () => {
    vi.useFakeTimers();
    const large = { ...file('large.mp4'), kind: 'video', mime: 'video/mp4', size: 210_000_000 } as ValidationResult;
    const short = { ...file('short.mp4'), kind: 'video', mime: 'video/mp4' } as ValidationResult;
    const files = [large, file('photo-1.jpg'), short, file('photo-2.jpg')];
    let active = 0, maxActive = 0, videos = 0, maxVideos = 0;
    const completions: { name: string; elapsed: number }[] = [];
    const baseline = Date.now();
    backend.transfers.mockImplementation((f: File, config: any) => {
      const video = f.name.endsWith('.mp4');
      active++; if (video) videos++;
      maxActive = Math.max(maxActive, active); maxVideos = Math.max(maxVideos, videos);
      expect(config.chunkSize).toBe(6 * 1024 * 1024);
      expect(config.parallelUploads).toBeUndefined();
      expect(config.metadata.contentType).toBe(video ? 'video/mp4' : 'image/jpeg');
      expect(config.headers['x-upsert']).toBe('false');
      expect(config.headers.authorization).toBeUndefined();
      return new Promise<void>(resolve => setTimeout(() => {
        active--; if (video) videos--;
        completions.push({ name: f.name, elapsed: Date.now() - baseline });
        config.onProgress(100, 100);
        resolve();
      }, video ? f.name === 'large.mp4' ? 5000 : 1000 : 500));
    });
    const { result } = renderHook(() => useGuestMediaUpload());
    let batch: Promise<void>;
    await act(async () => { batch = result.current.uploadFiles(files, options); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(result.current.progress[1].status).toBe('done');
    expect(result.current.progress[3].status).toBe('done');
    expect(result.current.progress[0].status).toBe('uploading');
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); await batch!; });
    expect(maxActive).toBe(2); expect(maxVideos).toBe(1);
    expect(completions).toEqual([
      { name: 'photo-1.jpg', elapsed: 500 }, { name: 'photo-2.jpg', elapsed: 1000 },
      { name: 'large.mp4', elapsed: 5000 }, { name: 'short.mp4', elapsed: 6000 },
    ]);
    expect(result.current.progress.every(p => p.status === 'done')).toBe(true);
    expect(result.current.progress[0].timings?.transferMs).toBeGreaterThanOrEqual(0);
  });
  it('distinguishes transferred bytes from finalisation and records retry/creation timings without secrets', async () => {
    let release!: () => void;
    const normal = backend.rpc.getMockImplementation()!;
    backend.rpc.mockImplementation(async (name: string, args: any) => {
      if (name === 'finalize_event_media_upload') await new Promise<void>(resolve => { release = resolve; });
      return normal(name, args);
    });
    backend.transfers.mockImplementation(async (_file: File, config: any) => {
      const request = { getMethod: () => 'POST', setHeader: vi.fn() };
      await config.onBeforeRequest(request); config.onAfterResponse(request, { getStatus: () => 201 });
      expect(request.setHeader).toHaveBeenCalledWith('authorization', 'Bearer test');
      expect(config.onShouldRetry({}, 0, config)).toBe(true);
      config.onProgress(99.9, 100); config.onProgress(100, 100);
    });
    const { result } = renderHook(() => useGuestMediaUpload());
    let batch: Promise<void>;
    await act(async () => { batch = result.current.uploadFiles([file('photo.jpg')], options); });
    expect(result.current.progress[0].status).toBe('uploading');
    expect(result.current.progress[0].percent).toBe(100);
    expect(result.current.progress[0].phase).toBe('finalizing');
    await act(async () => { release(); await batch!; });
    expect(result.current.progress[0].percent).toBe(100);
    expect(result.current.progress[0].timings?.retries).toBe(1);
    expect(JSON.stringify(result.current.progress[0].timings)).not.toMatch(/secret|object|https/);
  });
});
