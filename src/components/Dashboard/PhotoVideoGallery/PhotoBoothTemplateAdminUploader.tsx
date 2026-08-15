import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FolderOpen, Loader2, Upload, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import {
  PHOTO_BOOTH_TEMPLATE_MAX_FILES,
  uploadPhotoBoothTemplate,
  validatePhotoBoothTemplateFile,
} from '@/lib/photoBoothTemplateAdmin';
import managementStyles from './photoVideoSharingManagement.module.css';

type UploadRow = { file: File; status: 'queued' | 'validating' | 'uploading' | 'done' | 'failed'; error?: string };

interface Props { onComplete: () => Promise<void> | void }

export const PhotoBoothTemplateAdminUploader: React.FC<Props> = ({ onComplete }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [category, setCategory] = useState('General');
  const [running, setRunning] = useState(false);
  const stats = useMemo(() => ({
    total: rows.length,
    queued: rows.filter((row) => row.status === 'queued').length,
    done: rows.filter((row) => row.status === 'done').length,
    failed: rows.filter((row) => row.status === 'failed').length,
  }), [rows]);

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list).slice(0, Math.max(0, PHOTO_BOOTH_TEMPLATE_MAX_FILES - rows.length));
    setRows((current) => [...current, ...files.map((file) => ({ file, status: 'queued' as const }))]);
  };

  const start = async () => {
    if (running) return;
    setRunning(true);
    const pending = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.status === 'queued');
    for (const { row, index } of pending) {
      try {
        setRows((current) => current.map((item, i) => i === index ? { ...item, status: 'validating', error: undefined } : item));
        await validatePhotoBoothTemplateFile(row.file);
        setRows((current) => current.map((item, i) => i === index ? { ...item, status: 'uploading' } : item));
        await uploadPhotoBoothTemplate(row.file, category);
        setRows((current) => current.map((item, i) => i === index ? { ...item, status: 'done' } : item));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed.';
        setRows((current) => current.map((item, i) => i === index ? { ...item, status: 'failed', error: message } : item));
      }
    }
    setRunning(false);
    await onComplete();
  };

  return (
    <section className={managementStyles.templateAdminUploader} aria-label="Photo Booth template admin upload">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="photo-booth-upload-category" className="block text-xs font-semibold text-white mb-1">Category for this upload</label>
          <Input id="photo-booth-upload-category" value={category} onChange={(event) => setCategory(event.target.value)} className={managementStyles.templateLibraryControl} />
        </div>
        <Button type="button" variant="outline" className={managementStyles.templateLibrarySecondaryAction} onClick={() => inputRef.current?.click()} disabled={running || rows.length >= PHOTO_BOOTH_TEMPLATE_MAX_FILES}>
          <FolderOpen className="h-4 w-4 mr-1" /> Choose images
        </Button>
        <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="hidden" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }} />
        <Button type="button" className={managementStyles.galleryViewPrimaryAction} onClick={start} disabled={running || stats.queued === 0}>
          {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          {running ? 'Uploading…' : `Upload ${stats.queued || ''}`.trim()}
        </Button>
      </div>
      <p className="mt-2 text-xs text-[#e8ddd2]">Exactly 1200 × 1800 px · JPG, JPEG or PNG · up to 96 images</p>
      {rows.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#e8ddd2]" aria-live="polite">
            <span>Total {stats.total}</span><span>Successful {stats.done}</span><span>Failed {stats.failed}</span><span>Waiting {stats.queued}</span>
          </div>
          <div className="mt-2 max-h-44 overflow-y-auto space-y-1">
            {rows.map((row, index) => (
              <div key={`${row.file.name}-${index}`} className="flex items-start gap-2 rounded-md border border-[#d3a165]/30 bg-black/20 px-2 py-1.5 text-xs">
                {row.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" /> : row.status === 'failed' ? <XCircle className="h-4 w-4 text-red-400 shrink-0" /> : row.status !== 'queued' ? <Loader2 className="h-4 w-4 animate-spin text-[#d9b77f] shrink-0" /> : null}
                <span className="min-w-0 flex-1 break-words text-white">{row.file.name}</span>
                <span className={row.status === 'failed' ? 'text-red-300 text-right' : 'text-[#e8ddd2]'}>{row.error || row.status}</span>
              </div>
            ))}
          </div>
          {!running && (stats.done > 0 || stats.failed > 0) && <p className="mt-2 text-xs text-white">Complete: {stats.done} uploaded, {stats.failed} rejected or failed.</p>}
        </>
      )}
    </section>
  );
};
