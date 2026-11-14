// Guest-side upload hook — register → tus resumable upload → finalize
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as tus from 'tus-js-client';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { ValidationResult, MediaLimits } from '@/lib/mediaValidation';
import { normaliseGalleryAlbum, type ManageableGalleryAlbum } from '@/lib/galleryAlbumOptions';
import { resumableUploadEndpoint } from '@/lib/resumableUploadEndpoint';
import { guestUploadCheckpoint, saveGuestUploadCheckpoint, clearGuestUploadCheckpoint, type GuestUploadCheckpoint } from '@/lib/guestUploadCheckpoint';
import { recordUploadDiagnostic, uploadFailureDetails } from '@/lib/guestUploadDiagnostics';
// In-memory diagnostics contain durations/counts only, never credentials or URLs.
export interface UploadTimings {
    registrationMs: number;
    registrationWaitMs: number;
    sessionMs: number;
    resumeLookupMs: number;
    transferMs: number;
    creationMs: number;
    finalizationMs: number;
    retries: number;
}
export interface UploadProgress {
    fileName: string;
    status: 'pending' | 'uploading' | 'done' | 'error' | 'skipped';
    percent: number;
    error?: string;
    timings?: UploadTimings;
    phase?: 'registering' | 'transferring' | 'finalizing';
}
export interface UploadOptions {
    token: string;
    uploaderName: string;
    caption?: string;
    guestbookMessage?: string;
    album?: ManageableGalleryAlbum | null;
    limits: MediaLimits;
}
async function uploadOne(vf: ValidationResult, opts: UploadOptions, onProgress: (p: number) => void, checkpoint: GuestUploadCheckpoint, timings: UploadTimings, register: (task: () => Promise<void>) => Promise<void>, onPhase: (phase: NonNullable<UploadProgress['phase']>) => void): Promise<void> {
    if (!vf.kind)
        throw new Error('Unsupported file type');
    // Every attempt validates the same reservation against live scope/revocation.
    // The persisted nonce and secret make a lost registration response safe.
    {
        const queued = performance.now();
        await register(async () => {
            timings.registrationWaitMs += performance.now() - queued;
            const started = performance.now();
            try {
                const { data, error } = await (supabase as any).rpc('register_event_media_upload_v2', {
                    _token: opts.token,
                    _request_id: checkpoint.requestId,
                    _upload_secret: checkpoint.secret,
                    _kind: vf.kind,
                    _mime_type: vf.mime,
                    _byte_size: vf.size,
                    _duration_sec: vf.duration ?? null,
                    _uploader_name: opts.uploaderName || null,
                    _caption: opts.caption || null,
                    _guestbook_message: opts.guestbookMessage || null,
                    _filename: vf.file.name,
                    _album: normaliseGalleryAlbum(opts.album),
                });
                if (error)
                    throw Object.assign(new Error('Could not register upload'), uploadFailureDetails(error));
                const row = Array.isArray(data) ? data[0] : data;
                if (!row?.item_id)
                    throw new Error('Could not register upload');
                checkpoint.registration = row;
                if (row.already_uploaded) checkpoint.done = true;
                saveGuestUploadCheckpoint(checkpoint);
            }
            finally {
                timings.registrationMs += performance.now() - started;
            }
        });
    }
    if (checkpoint.done) return;
    const { item_id, storage_path, upload_token } = checkpoint.registration as {
        item_id: string;
        storage_path: string;
        upload_token: string;
    };
    if (!checkpoint.transferred) {
        onPhase('transferring');
        const transferStarted = performance.now();
        try {
            await new Promise<void>((resolve, reject) => {
                const requests = new WeakMap<object, number>();
                const upload = new tus.Upload(vf.file, {
                    endpoint: resumableUploadEndpoint(SUPABASE_URL),
                    retryDelays: [0, 1000, 3000, 5000],
                    headers: {
                        // XHR appends repeated headers. Authorization is set ONLY
                        // in onBeforeRequest, including for retries/resumed chunks.
                        apikey: SUPABASE_PUBLISHABLE_KEY,
                        'x-upsert': 'false',
                    },
                    uploadDataDuringCreation: true,
                    removeFingerprintOnSuccess: true,
                    fingerprint: async () => `event-media:${storage_path}`,
                    metadata: {
                        bucketName: 'event-media',
                        objectName: storage_path,
                        contentType: vf.mime,
                        cacheControl: '3600',
                    },
                    chunkSize: 6 * 1024 * 1024,
                    onBeforeRequest: async req => {
                        // A signed-in guest's JWT can expire before a slow transfer
                        // ends. Read the SDK's current/refreshed session per request;
                        // the item scope and hard deadline remain enforced by RLS.
                        const started = performance.now();
                        const { data, error } = await supabase.auth.getSession();
                        timings.sessionMs += performance.now() - started;
                        if (error) throw error;
                        req.setHeader('authorization', `Bearer ${data?.session?.access_token ?? SUPABASE_PUBLISHABLE_KEY}`);
                        requests.set(req, performance.now());
                    },
                    onAfterResponse: (req) => {
                        const started = requests.get(req);
                        if (started !== undefined && req.getMethod() === 'POST') {
                            // Creation includes the first chunk when uploadDataDuringCreation
                            // is enabled, and is a subset of transferMs, not additive.
                            timings.creationMs += performance.now() - started;
                        }
                    },
                    onShouldRetry: (error, attempt, options) => {
                        const retry = tus.defaultOptions.onShouldRetry!(error, attempt, options);
                        if (retry)
                            timings.retries++;
                        return retry;
                    },
                    onError: (err) => reject(err),
                    onProgress: (sent, total) => onProgress(total > 0 ? Math.min(100, Math.floor((sent / total) * 100)) : 0),
                    onSuccess: () => resolve(),
                });
                const lookupStarted = performance.now();
                upload.findPreviousUploads().then(prev => {
                    timings.resumeLookupMs += performance.now() - lookupStarted;
                    if (prev.length > 0)
                        upload.resumeFromPreviousUpload(prev[0]);
                    upload.start();
                }).catch(() => {
                    timings.resumeLookupMs += performance.now() - lookupStarted;
                    upload.start();
                });
            });
        }
        finally {
            timings.transferMs += performance.now() - transferStarted;
        }
        checkpoint.transferred = true;
        saveGuestUploadCheckpoint(checkpoint);
    }
    const finalizationStarted = performance.now();
    onProgress(100);
    onPhase('finalizing');
    try {
        const { data: okData, error: finErr } = await (supabase as any).rpc('finalize_event_media_upload', {
            _item_id: item_id,
            _upload_token: upload_token,
        });
        if (finErr || !okData) {
            // A failed response can follow a committed save. Retain the registration;
            // never mark that object failed or create another object on a retry.
            throw Object.assign(new Error('Could not finalize upload'), uploadFailureDetails(finErr));
        }
        checkpoint.done = true;
        saveGuestUploadCheckpoint(checkpoint);
    }
    finally {
        timings.finalizationMs += performance.now() - finalizationStarted;
    }
}
export function useGuestMediaUpload() {
    const { t } = useTranslation('common');
    const busy = useRef(false);
    const registrationTail = useRef(Promise.resolve());
    const checkpoints = useRef(new WeakMap<File, Map<string, GuestUploadCheckpoint>>());
    const storageKeys = useRef(new Set<string>());
    const [progress, setProgress] = useState<UploadProgress[]>([]);
    const [uploading, setUploading] = useState(false);
    /**
     * One photo lane and one video lane: at most two files in flight, and
     * never two large videos competing with queued photos.
     * Invalid items must be marked ok=false; they are skipped (not aborted)
     * so the remaining files still upload.
     */
    const uploadFiles = useCallback(async (validated: ValidationResult[], opts: UploadOptions) => {
        if (busy.current)
            return;
        busy.current = true;
        setUploading(true);
        const scope = JSON.stringify([opts.token, opts.uploaderName, opts.caption, opts.guestbookMessage, normaliseGalleryAlbum(opts.album)]);
        let states: GuestUploadCheckpoint[];
        try {
        states = await Promise.all(validated.map(async v => {
            let scopes = checkpoints.current.get(v.file);
            if (!scopes) {
                scopes = new Map();
                checkpoints.current.set(v.file, scopes);
            }
            let state = scopes.get(scope);
            if (!state) {
                state = await guestUploadCheckpoint(v.file, scope);
                scopes.set(scope, state);
            }
            if (state.storageKey) storageKeys.current.add(state.storageKey);
            return state;
        }));
        } catch {
            recordUploadDiagnostic({ stage: 'checkpoint', kind: 'unknown', bytes: 0, outcome: 'error' });
            setProgress(validated.map(v => ({ fileName: v.fileName, status: 'error', percent: 0, error: `${t('error')}. ${t('retry')}.` })));
            busy.current = false; setUploading(false); return;
        }
        setUploading(true);
        const init: UploadProgress[] = validated.map((v, i) => ({
            fileName: v.fileName,
            status: v.ok ? states[i].done ? 'done' : 'pending' : 'error',
            percent: states[i].done ? 100 : 0,
            error: v.ok ? undefined : v.reasonText,
        }));
        setProgress(init);
        // Keep quota/reservation RPCs sequential while file transfers overlap.
        const register = (task: () => Promise<void>) => {
            const pending = registrationTail.current.then(task);
            registrationTail.current = pending.catch(() => { });
            return pending;
        };
        const uploadItem = async (i: number) => {
            const vf = validated[i];
            if (!vf.ok || states[i].done)
                return;
            const timings: UploadTimings = { registrationMs: 0, registrationWaitMs: 0, sessionMs: 0, resumeLookupMs: 0, transferMs: 0, creationMs: 0, finalizationMs: 0, retries: 0 };
            let stage: 'registering' | 'transferring' | 'finalizing' = 'registering';
            setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'uploading', phase: 'registering', percent: states[i].transferred ? 100 : 0, error: undefined, timings } : x));
            try {
                await uploadOne(vf, opts, (pct) => setProgress(p => p[i]?.percent === pct ? p : p.map((x, idx) => idx === i ? { ...x, percent: pct } : x)), states[i], timings, register, phase => { stage = phase; setProgress(p => p.map((x, idx) => idx === i ? { ...x, phase } : x)); });
                recordUploadDiagnostic({ stage: 'complete', kind: vf.kind ?? 'unknown', bytes: vf.size, outcome: 'done' });
                setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'done', percent: 100, timings: { ...timings } } : x));
            }
            catch (e: any) {
                recordUploadDiagnostic({ stage, kind: vf.kind ?? 'unknown', bytes: vf.size, outcome: 'error', ...uploadFailureDetails(e) });
                const msg = `${t('error')}. ${t('retry')}.`;
                setProgress(p => p.map((x, idx) => idx === i ? { ...x, status: 'error', error: msg, timings: { ...timings } } : x));
                // continue with next file
            }
        };
        const runLane = async (video: boolean) => {
            for (let i = 0; i < validated.length; i++) {
                if ((validated[i].kind === 'video') === video)
                    await uploadItem(i);
            }
        };
        try {
            await Promise.all([runLane(false), runLane(true)]);
        }
        finally {
            setUploading(false);
            busy.current = false;
        }
    }, [t]);
    const reset = useCallback(() => {
        if (busy.current)
            return;
        checkpoints.current = new WeakMap();
        storageKeys.current.forEach(clearGuestUploadCheckpoint);
        storageKeys.current.clear();
        setProgress([]);
    }, []);
    return { uploadFiles, progress, uploading, reset };
}
