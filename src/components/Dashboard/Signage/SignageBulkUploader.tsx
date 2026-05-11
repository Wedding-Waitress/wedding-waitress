import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, RotateCw, CheckCircle2, XCircle, Trash2, FolderOpen } from 'lucide-react';
import { MAX_SIGNAGE_UPLOAD_BYTES, prettifySignageFilename, uploadSignageGalleryImage } from './signageUploadUtils';

const CATEGORY_PRESETS = [
  'Asian Wedding',
  'Indian Wedding',
  'Persian Wedding',
  'Classic / Elegant',
  'Floral',
  'Modern / Minimal',
  'Rustic',
  'Luxury / Gold',
  'Vintage',
  'Tropical',
];

const CONCURRENCY = 3;
const DEFAULT_BULK_CATEGORY = 'Uncategorized';

type RowStatus = 'queued' | 'uploading' | 'done' | 'failed';

interface Row {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  category: string;
  status: RowStatus;
  error?: string;
  masterKB?: number;
  thumbKB?: number;
}

interface Props {
  defaultCategory?: string;
  onAllDone?: () => void;
}

export const SignageBulkUploader: React.FC<Props> = ({ defaultCategory = '', onAllDone }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [defaultCat, setDefaultCat] = useState(defaultCategory);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<Row[]>([]);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const done = rows.filter((r) => r.status === 'done').length;
    const failed = rows.filter((r) => r.status === 'failed').length;
    const queued = rows.filter((r) => r.status === 'queued').length;
    const uploading = rows.filter((r) => r.status === 'uploading').length;
    return { total, done, failed, queued, uploading };
  }, [rows]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => /^image\/(png|jpe?g)$/i.test(f.type));
      if (arr.length === 0) {
        toast({ title: 'No valid images', description: 'PNG or JPG only.', variant: 'destructive' });
        return;
      }
      const newRows: Row[] = arr.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: prettifySignageFilename(file.name),
        category: defaultCat.trim() || DEFAULT_BULK_CATEGORY,
        status: file.size > MAX_SIGNAGE_UPLOAD_BYTES ? 'failed' : 'queued',
        error: file.size > MAX_SIGNAGE_UPLOAD_BYTES ? `File >50 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)` : undefined,
      }));
      setRows((prev) => [...prev, ...newRows]);
    },
    [defaultCat, toast]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    setRows((prev) => {
      const r = prev.find((x) => x.id === id);
      if (r) URL.revokeObjectURL(r.previewUrl);
      return prev.filter((x) => x.id !== id);
    });

  const clearDone = () =>
    setRows((prev) => {
      prev.filter((r) => r.status === 'done').forEach((r) => URL.revokeObjectURL(r.previewUrl));
      return prev.filter((r) => r.status !== 'done');
    });

  const applyDefaultCategoryToAll = () => {
    if (!defaultCat.trim()) return;
    setRows((prev) => prev.map((r) => (r.status === 'done' ? r : { ...r, category: defaultCat })));
  };

  const uploadOne = async (row: Row) => {
    if (!row.name.trim() || !row.category.trim()) {
      updateRow(row.id, { status: 'failed', error: 'Missing name or category' });
      return;
    }
    updateRow(row.id, { status: 'uploading', error: undefined });
    try {
      const result = await uploadSignageGalleryImage(row.file, row.name.trim(), row.category.trim());
      const masterKB = Math.round(result.masterBytes / 1024);
      const thumbKB = Math.round(result.thumbBytes / 1024);
      updateRow(row.id, { status: 'done', masterKB, thumbKB });
    } catch (err: any) {
      console.error('Bulk upload row failed', err);
      updateRow(row.id, { status: 'failed', error: err?.message ?? 'Upload failed' });
    }
  };

  const startUpload = async () => {
    if (running) return;

    // Auto-apply default category to any queued row that has none.
    // Match single upload behavior: blank category safely becomes Uncategorized.
    const trimmedDefault = defaultCat.trim();
    const fallbackCategory = trimmedDefault || DEFAULT_BULK_CATEGORY;
    setRows((prev) =>
      prev.map((r) =>
        r.status === 'queued' && !r.category.trim() ? { ...r, category: fallbackCategory } : r
      )
    );
    // Sync ref immediately so the workers below see the patched rows
    rowsRef.current = rowsRef.current.map((r) =>
      r.status === 'queued' && !r.category.trim() ? { ...r, category: fallbackCategory } : r
    );

    const queued = rowsRef.current.filter((r) => r.status === 'queued');
    if (queued.length === 0) {
      toast({ title: 'Nothing to upload', description: 'All rows are already processed.' });
      return;
    }

    const missing = queued.filter((r) => !r.name.trim() || !r.category.trim());
    if (missing.length > 0) {
      toast({
        title: 'Name required',
        description: `${missing.length} file(s) need a design name before uploading.`,
        variant: 'destructive',
      });
      return;
    }

    setRunning(true);
    const pendingIds = queued.map((r) => r.id);

    let cursor = 0;
    const getNext = (): string | null => {
      if (cursor >= pendingIds.length) return null;
      return pendingIds[cursor++];
    };

    const worker = async () => {
      while (true) {
        const id = getNext();
        if (!id) return;
        const current = rowsRef.current.find((r) => r.id === id);
        if (!current) continue;
        // eslint-disable-next-line no-await-in-loop
        await uploadOne(current);
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
    onAllDone?.();
    toast({
      title: 'Bulk upload complete',
      description: `${pendingIds.length} processed.`,
    });
  };

  const retryFailed = () => {
    setRows((prev) =>
      prev.map((r) => (r.status === 'failed' && !r.error?.includes('>50 MB') ? { ...r, status: 'queued', error: undefined } : r))
    );
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-3">
      {/* Default category bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Default category for new files (e.g. Asian Wedding)"
          value={defaultCat}
          onChange={(e) => setDefaultCat(e.target.value)}
          list="signage-cat-presets"
          disabled={running}
        />
        <datalist id="signage-cat-presets">
          {CATEGORY_PRESETS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Button variant="outline" onClick={applyDefaultCategoryToAll} disabled={running || !defaultCat.trim()} className="lv-premium-shade">
          Apply to all
        </Button>
      </div>

      {/* Dropzone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="rounded-lg border-2 border-dashed border-border bg-background/50 px-4 py-6 text-center cursor-pointer hover:border-primary/60 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <FolderOpen className="h-8 w-8 mx-auto text-primary mb-2" />
        <p className="text-sm font-medium">Drag & drop images here, or click to select</p>
        <p className="text-xs text-muted-foreground mt-1">PNG / JPG · up to 50 MB each · select hundreds at a time</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Stats + controls */}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">
            {stats.done} / {stats.total} done
          </span>
          {stats.failed > 0 && <span className="text-destructive">· {stats.failed} failed</span>}
          {stats.uploading > 0 && <span className="text-primary">· {stats.uploading} uploading</span>}
          <div className="ml-auto flex gap-2">
            {stats.failed > 0 && !running && (
              <Button variant="outline" size="sm" onClick={retryFailed} className="lv-premium-shade">
                <RotateCw className="h-4 w-4 mr-1" />
                Retry failed
              </Button>
            )}
            {stats.done > 0 && !running && (
              <Button variant="outline" size="sm" onClick={clearDone} className="lv-premium-shade">
                Clear done
              </Button>
            )}
            <Button
              onClick={startUpload}
              disabled={running || stats.queued === 0}
              className="bg-green-600 hover:bg-green-700 text-white lv-premium-shade"
              size="sm"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Start upload ({stats.queued})
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Rows */}
      {rows.length > 0 && (
        <ScrollArea className="h-[360px] rounded-lg border border-border bg-background">
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 p-2">
                <img
                  src={row.previewUrl}
                  alt=""
                  className="w-12 h-12 object-cover rounded border border-border flex-shrink-0"
                />
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    disabled={running || row.status === 'uploading' || row.status === 'done'}
                    className="h-8 text-sm"
                    placeholder="Name"
                  />
                  <Input
                    value={row.category}
                    onChange={(e) => updateRow(row.id, { category: e.target.value })}
                    disabled={running || row.status === 'uploading' || row.status === 'done'}
                    className="h-8 text-sm"
                    placeholder="Category"
                    list="signage-cat-presets"
                  />
                </div>
                <div className="w-40 text-xs flex items-center gap-1.5 flex-shrink-0">
                  {row.status === 'queued' && <span className="text-muted-foreground">Queued</span>}
                  {row.status === 'uploading' && (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span className="text-primary">Optimizing…</span>
                    </>
                  )}
                  {row.status === 'done' && (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-green-700">
                        {row.masterKB}KB / {row.thumbKB}KB
                      </span>
                    </>
                  )}
                  {row.status === 'failed' && (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-destructive truncate" title={row.error}>
                        {row.error || 'Failed'}
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={row.status === 'uploading'}
                  className="text-muted-foreground hover:text-destructive p-1 disabled:opacity-30"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <p className="text-xs text-muted-foreground">
        Each file is saved as the full-quality original for print, with an 800px web thumbnail generated in your browser. 3 files upload in parallel.
      </p>
    </div>
  );
};
