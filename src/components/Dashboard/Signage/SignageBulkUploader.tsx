import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, FolderOpen, Loader2, RotateCw, Trash2, Upload, XCircle } from 'lucide-react';
import {
  MAX_SIGNAGE_UPLOAD_BYTES,
  createPreviewThumbnail,
  prettifySignageFilename,
  uploadSignageGalleryImage,
} from './signageUploadUtils';
import { getReadableUploadError } from '../galleryUploadCore';

const CATEGORY_PRESETS = [
  'Asian',
  'Baby Shower',
  'Birthday',
  'Celebrations',
  'Chinese',
  'Christmas',
  'Cultural',
  'Elegant',
  'Floral',
  'Glamour',
  'Islamic',
  'Kids',
  'Minimal',
  'Religious',
  'Tropical',
  'Vintage',
  'Wedding',
];

const CONCURRENCY = 2;
const DEFAULT_BULK_CATEGORY = 'Uncategorized';
const SUPPORTED_IMAGE_TYPE = /^image\/(png|jpe?g)$/i;

export interface SignageBulkUploaderHandle {
  addFiles: (files: FileList | File[]) => void;
}

type RowStatus = 'queued' | 'uploading' | 'done' | 'failed';

interface Row {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  status: RowStatus;
  error?: string;
  progressPercent?: number;
  progressMessage?: string;
}

interface Props {
  defaultCategory?: string;
  onAllDone?: () => void;
}

export const SignageBulkUploader = forwardRef<SignageBulkUploaderHandle, Props>(
  ({ defaultCategory = '', onAllDone }, ref) => {
    const { toast } = useToast();
    const [category, setCategory] = useState(defaultCategory || DEFAULT_BULK_CATEGORY);
    const [rows, setRows] = useState<Row[]>([]);
    const [running, setRunning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const rowsRef = useRef<Row[]>([]);

    const replaceRows = useCallback((updater: (current: Row[]) => Row[]) => {
      setRows((current) => {
        const next = updater(current);
        rowsRef.current = next;
        return next;
      });
    }, []);

    const stats = useMemo(() => {
      const total = rows.length;
      const successful = rows.filter((row) => row.status === 'done').length;
      const failed = rows.filter((row) => row.status === 'failed').length;
      const waiting = rows.filter((row) => row.status === 'queued').length;
      const uploading = rows.filter((row) => row.status === 'uploading').length;
      return { total, successful, failed, waiting, uploading };
    }, [rows]);

    const addFiles = useCallback(
      async (files: FileList | File[]) => {
        const selected = Array.from(files);
        if (selected.length === 0) return;

        const CHUNK_SIZE = 3;
        for (let index = 0; index < selected.length; index += CHUNK_SIZE) {
          const chunk = selected.slice(index, index + CHUNK_SIZE);
          // Small chunks keep the modal responsive for batches of high-resolution signs.
          // eslint-disable-next-line no-await-in-loop
          const additions = await Promise.all(
            chunk.map(async (file): Promise<Row> => {
              const supported = SUPPORTED_IMAGE_TYPE.test(file.type);
              const oversize = file.size > MAX_SIGNAGE_UPLOAD_BYTES;
              const previewUrl = supported && !oversize ? ((await createPreviewThumbnail(file, 96)) ?? '') : '';
              let error: string | undefined;
              if (!supported) error = 'PNG or JPG images only.';
              if (oversize) error = `File exceeds 500 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;

              return {
                id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
                file,
                previewUrl,
                name: prettifySignageFilename(file.name),
                status: error ? 'failed' : 'queued',
                error,
              };
            }),
          );
          replaceRows((current) => [...current, ...additions]);
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      },
      [replaceRows],
    );

    useImperativeHandle(ref, () => ({ addFiles }), [addFiles]);

    const updateRow = (id: string, patch: Partial<Row>) => {
      replaceRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    };

    const removeRow = (id: string) => {
      replaceRows((current) => current.filter((row) => row.id !== id));
    };

    const retryFailed = () => {
      replaceRows((current) => current.map((row) => {
        const canRetry = row.status === 'failed'
          && SUPPORTED_IMAGE_TYPE.test(row.file.type)
          && row.file.size <= MAX_SIGNAGE_UPLOAD_BYTES;
        return canRetry ? { ...row, status: 'queued', error: undefined } : row;
      }));
    };

    const uploadOne = async (row: Row, uploadCategory: string) => {
      updateRow(row.id, {
        status: 'uploading',
        error: undefined,
        progressPercent: 0,
        progressMessage: 'Preparing…',
      });
      try {
        await uploadSignageGalleryImage(row.file, row.name, uploadCategory, (progress) => {
          updateRow(row.id, {
            progressPercent: progress.percent,
            progressMessage: progress.message,
          });
        });
        updateRow(row.id, {
          status: 'done',
          progressPercent: 100,
          progressMessage: undefined,
        });
      } catch (error) {
        console.error('Seating Chart Signs upload failed', error);
        updateRow(row.id, {
          status: 'failed',
          error: getReadableUploadError(error, 'Upload failed'),
          progressMessage: undefined,
        });
      }
    };

    const startUpload = async () => {
      if (running) return;
      const uploadCategory = category.trim();
      if (!uploadCategory) {
        toast({ title: 'Category required', description: 'Enter a category for this upload.', variant: 'destructive' });
        return;
      }

      const queued = rowsRef.current.filter((row) => row.status === 'queued');
      if (queued.length === 0) {
        toast({ title: 'Nothing to upload', description: 'Choose one or more images first.' });
        return;
      }

      setRunning(true);
      let cursor = 0;
      const worker = async () => {
        while (cursor < queued.length) {
          const row = queued[cursor];
          cursor += 1;
          // eslint-disable-next-line no-await-in-loop
          await uploadOne(row, uploadCategory);
        }
      };

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queued.length) }, worker));
      setRunning(false);
      onAllDone?.();
    };

    const isComplete = rows.length > 0 && stats.waiting === 0 && stats.uploading === 0;

    return (
      <section className="rounded-lg border border-border bg-muted/30 p-3" aria-label="Admin upload">
        <datalist id="signage-category-presets">
          {CATEGORY_PRESETS.map((preset) => <option key={preset} value={preset} />)}
        </datalist>

        <label htmlFor="signage-upload-category" className="mb-1 block text-sm font-medium text-foreground">
          Category for this upload
        </label>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            id="signage-upload-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            list="signage-category-presets"
            disabled={running}
            className="min-w-0 flex-1 bg-white"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) void addFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="lv-premium-shade shrink-0"
            disabled={running}
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen className="mr-1 h-4 w-4" />
            Choose images
          </Button>
          <Button
            type="button"
            className="lv-premium-shade shrink-0 bg-green-600 text-white hover:bg-green-700"
            disabled={running || stats.waiting === 0 || !category.trim()}
            onClick={() => { void startUpload(); }}
          >
            {running ? <Loader2 className="mr-1 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Upload className="mr-1 h-4 w-4" />}
            {running ? 'Uploading…' : 'Upload'}
          </Button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          PNG or JPG, up to 500 MB per image. High-resolution artwork is recommended for A1 signs at 300 DPI.
        </p>

        {rows.length > 0 && (
          <>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground" aria-live="polite">
              <span>Total {stats.total}</span>
              <span>Successful {stats.successful}</span>
              <span>Failed {stats.failed}</span>
              <span>Waiting {stats.waiting}</span>
            </div>

            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
              {rows.map((row) => (
                <div key={row.id} className="rounded-md border border-border bg-white px-2 py-1.5 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    {row.status === 'done' && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
                    {row.status === 'failed' && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
                    {row.status === 'uploading' && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" />}
                    <span className="min-w-0 flex-1 truncate" title={row.file.name}>{row.file.name}</span>
                    <span className={row.status === 'failed' ? 'text-destructive' : row.status === 'done' ? 'text-green-700' : 'text-muted-foreground'}>
                      {row.status === 'queued' ? 'waiting' : row.status}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${row.file.name}`}
                      disabled={running || row.status === 'uploading'}
                      onClick={() => removeRow(row.id)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {row.status === 'uploading' && (
                    <div className="mt-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-green-600 transition-[width] motion-reduce:transition-none" style={{ width: `${row.progressPercent ?? 0}%` }} />
                      </div>
                      <p className="mt-0.5 text-muted-foreground">{row.progressMessage || 'Uploading…'} {row.progressPercent ?? 0}%</p>
                    </div>
                  )}
                  {row.error && <p className="mt-0.5 break-words text-destructive">{row.error}</p>}
                </div>
              ))}
            </div>

            {stats.failed > 0 && !running && (
              <Button type="button" variant="outline" size="sm" className="lv-premium-shade mt-2" onClick={retryFailed}>
                <RotateCw className="mr-1 h-4 w-4" />
                Retry failed
              </Button>
            )}

            {isComplete && (
              <p className="mt-2 text-xs font-medium text-foreground" role="status">
                Complete: {stats.successful} uploaded, {stats.failed} rejected or failed.
              </p>
            )}
          </>
        )}
      </section>
    );
  },
);

SignageBulkUploader.displayName = 'SignageBulkUploader';
