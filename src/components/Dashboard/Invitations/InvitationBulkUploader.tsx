import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, RotateCw, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { MAX_INVITATION_UPLOAD_BYTES, prettifyInvitationFilename, uploadInvitationGalleryImage } from './invitationUploadUtils';
import { getReadableUploadError } from '../galleryUploadCore';

const CATEGORY_PRESETS = [
  'Baby Shower',
  'Birthday',
  'Celebrations',
  'Cultural',
  'Floral',
  'Glamour',
  'Islamic',
  'Religious',
  'Tropical',
  'Wedding',
];

const CONCURRENCY = 2;
const DEFAULT_BULK_CATEGORY = 'Uncategorized';

const CATEGORY_KEYWORDS: Array<{ category: string; patterns: RegExp[] }> = [
  { category: 'Baby Shower', patterns: [/baby/i, /shower/i, /bear/i, /stork/i] },
  { category: 'Birthday', patterns: [/birthday/i, /bday/i] },
  { category: 'Wedding', patterns: [/wedding/i, /bride/i, /groom/i, /marriage/i] },
  { category: 'Floral', patterns: [/floral/i, /flower/i, /bloom/i, /rose/i, /peony/i, /botanical/i] },
  { category: 'Tropical', patterns: [/tropical/i, /palm/i, /beach/i] },
  { category: 'Glamour', patterns: [/glam/i, /luxury/i, /gold/i, /royal/i] },
  { category: 'Islamic', patterns: [/islam/i, /muslim/i, /nikah/i, /eid/i] },
  { category: 'Religious', patterns: [/religious/i, /christ/i, /baptism/i, /communion/i] },
  { category: 'Cultural', patterns: [/cultural/i, /ethnic/i, /traditional/i, /asian/i, /indian/i] },
  { category: 'Celebrations', patterns: [/celebration/i, /party/i, /anniversary/i, /engagement/i] },
];

const autoCategorize = (filename: string): string => {
  for (const { category, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.some((p) => p.test(filename))) return category;
  }
  return DEFAULT_BULK_CATEGORY;
};

export interface InvitationBulkUploaderHandle {
  addFiles: (files: FileList | File[]) => void;
}

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

export const InvitationBulkUploader = forwardRef<InvitationBulkUploaderHandle, Props>(({ defaultCategory = '', onAllDone }, ref) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
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
        name: prettifyInvitationFilename(file.name),
        category: autoCategorize(file.name),
        status: file.size > MAX_INVITATION_UPLOAD_BYTES ? 'failed' : 'queued',
        error: file.size > MAX_INVITATION_UPLOAD_BYTES ? `File >500 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)` : undefined,
      }));
      setRows((prev) => [...prev, ...newRows]);
    },
    [toast]
  );

  useImperativeHandle(ref, () => ({ addFiles }), [addFiles]);

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

  const uploadOne = async (row: Row) => {
    if (!row.name.trim() || !row.category.trim()) {
      updateRow(row.id, { status: 'failed', error: 'Missing name or category' });
      return;
    }
    updateRow(row.id, { status: 'uploading', error: undefined });
    try {
      const result = await uploadInvitationGalleryImage(row.file, row.name.trim(), row.category.trim());
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

    const queued = rowsRef.current.filter((r) => r.status === 'queued');
    if (queued.length === 0) {
      toast({ title: 'Nothing to upload', description: 'All rows are already processed.' });
      return;
    }

    const missing = queued.filter((r) => !r.name.trim());
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
      prev.map((r) => (r.status === 'failed' && !r.error?.includes('>500 MB') ? { ...r, status: 'queued', error: undefined } : r))
    );
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2 flex flex-col gap-2">
      <datalist id="invitation-cat-presets">
        {CATEGORY_PRESETS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

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

      {rows.length > 0 && (
        <ScrollArea className="h-[340px] rounded-lg border border-border bg-background">
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div key={row.id} className="flex items-start gap-3 p-2">
                <img
                  src={row.previewUrl}
                  alt=""
                  className="w-12 h-12 object-cover rounded border border-border flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start gap-2">
                  <Input
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    disabled={running || row.status === 'uploading' || row.status === 'done'}
                    className="h-8 text-sm flex-1 min-w-0"
                    placeholder="Name"
                  />
                  <Input
                    value={row.category}
                    onChange={(e) => updateRow(row.id, { category: e.target.value })}
                    disabled={running || row.status === 'uploading' || row.status === 'done'}
                    className="h-8 text-sm w-full sm:w-32 flex-shrink-0"
                    placeholder="Category"
                    list="invitation-cat-presets"
                  />
                </div>
                <div className="w-72 text-xs flex items-start gap-1.5 flex-shrink-0 pt-1.5">
                  {row.status === 'queued' && <span className="text-muted-foreground">Queued</span>}
                  {row.status === 'uploading' && (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-primary">Optimizing…</span>
                    </>
                  )}
                  {row.status === 'done' && (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-green-700">
                        {row.masterKB}KB / {row.thumbKB}KB
                      </span>
                    </>
                  )}
                  {row.status === 'failed' && (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                      <span className="text-destructive break-words whitespace-normal leading-snug" title={row.error}>
                        {row.error || 'Failed'}
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={row.status === 'uploading'}
                  className="text-muted-foreground hover:text-destructive p-1 disabled:opacity-30 flex-shrink-0 mt-1.5"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
});
InvitationBulkUploader.displayName = 'InvitationBulkUploader';
