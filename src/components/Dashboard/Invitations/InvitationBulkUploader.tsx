import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { CheckCircle2, FolderOpen, Loader2, Upload, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MAX_INVITATION_UPLOAD_BYTES,
  prettifyInvitationFilename,
  uploadInvitationGalleryImage,
} from './invitationUploadUtils';
import styles from './InvitationGalleryModal.module.css';

type UploadStatus = 'waiting' | 'uploading' | 'successful' | 'failed';

interface UploadRow {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
}

export interface InvitationBulkUploaderHandle {
  addFiles: (files: FileList | File[]) => void;
}

interface InvitationBulkUploaderProps {
  defaultCategory?: string;
  onAllDone?: () => void | Promise<void>;
}

const isSupportedInvitationImage = (file: File) =>
  file.type === 'image/png' || file.type === 'image/jpeg' || /\.(png|jpe?g)$/i.test(file.name);

const makeRow = (file: File): UploadRow => {
  const invalidType = !isSupportedInvitationImage(file);
  const tooLarge = file.size > MAX_INVITATION_UPLOAD_BYTES;

  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    status: invalidType || tooLarge ? 'failed' : 'waiting',
    error: invalidType
      ? 'Please choose a PNG or JPG image.'
      : tooLarge
        ? 'This image exceeds the 500 MB limit.'
        : undefined,
  };
};

export const InvitationBulkUploader = forwardRef<
  InvitationBulkUploaderHandle,
  InvitationBulkUploaderProps
>(({ defaultCategory = 'General', onAllDone }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState(defaultCategory);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [uploading, setUploading] = useState(false);

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (!incoming.length) return;
    setRows((current) => [...current, ...incoming.map(makeRow)]);
  };

  useImperativeHandle(ref, () => ({ addFiles }), []);

  const uploadRows = async () => {
    const waiting = rows.filter((row) => row.status === 'waiting');
    if (!waiting.length || uploading) return;

    setUploading(true);
    const uploadCategory = category.trim() || 'Uncategorized';
    let cursor = 0;

    const worker = async () => {
      while (cursor < waiting.length) {
        const row = waiting[cursor++];
        setRows((current) =>
          current.map((item) => (item.id === row.id ? { ...item, status: 'uploading' } : item)),
        );

        try {
          await uploadInvitationGalleryImage(
            row.file,
            prettifyInvitationFilename(row.file.name),
            uploadCategory,
          );
          setRows((current) =>
            current.map((item) =>
              item.id === row.id ? { ...item, status: 'successful', error: undefined } : item,
            ),
          );
        } catch (error) {
          setRows((current) =>
            current.map((item) =>
              item.id === row.id
                ? {
                    ...item,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Upload failed.',
                  }
                : item,
            ),
          );
        }
      }
    };

    await Promise.all([worker(), worker()]);
    setUploading(false);
    await onAllDone?.();
  };

  const counts = rows.reduce(
    (result, row) => {
      result[row.status] += 1;
      return result;
    },
    { waiting: 0, uploading: 0, successful: 0, failed: 0 },
  );
  const waitingCount = counts.waiting + counts.uploading;
  const completed = rows.length > 0 && waitingCount === 0;

  return (
    <section className={styles.uploader} aria-label="Invitation template admin upload">
      <label className={styles.uploaderLabel} htmlFor="invitation-upload-category">
        Category for this upload
      </label>
      <div className={styles.uploaderControls}>
        <Input
          id="invitation-upload-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={styles.categoryInput}
        />
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          multiple
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          className={styles.secondaryButton}
          onClick={() => inputRef.current?.click()}
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
          Choose images
        </Button>
        <Button
          type="button"
          className={styles.primaryButton}
          disabled={uploading || counts.waiting === 0}
          onClick={() => void uploadRows()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          Upload{counts.waiting > 0 ? ` ${counts.waiting}` : ''}
        </Button>
      </div>

      <p className={styles.uploadRequirements}>
        PNG or JPG · maximum 500 MB per image · existing Invitations &amp; Cards validation applies
      </p>

      {rows.length > 0 && (
        <>
          <div className={styles.uploadCounts} aria-live="polite">
            <span>Total {rows.length}</span>
            <span>Successful {counts.successful}</span>
            <span>Failed {counts.failed}</span>
            <span>Waiting {waitingCount}</span>
          </div>
          <div className={styles.uploadRows}>
            {rows.map((row) => (
              <div className={styles.uploadRow} key={row.id}>
                <span className={styles.uploadFileName} title={row.file.name}>
                  {row.status === 'successful' && <CheckCircle2 aria-hidden="true" />}
                  {row.status === 'failed' && <XCircle aria-hidden="true" />}
                  {row.status === 'uploading' && (
                    <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  )}
                  {row.file.name}
                </span>
                <span className={row.status === 'failed' ? styles.failedStatus : undefined}>
                  {row.error || row.status}
                </span>
              </div>
            ))}
          </div>
          {completed && (
            <p className={styles.uploadSummary} role="status">
              Complete: {counts.successful} uploaded, {counts.failed} rejected or failed.
            </p>
          )}
        </>
      )}
    </section>
  );
});

InvitationBulkUploader.displayName = 'InvitationBulkUploader';
