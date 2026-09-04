import React from 'react';
import { Image as ImageIcon, Loader2, RotateCcw, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  createEventImageSignedUrl,
  clampEventImagePosition,
  clampEventImageZoom,
  EVENT_IMAGE_ACCEPT,
  EVENT_IMAGE_BUCKET,
  EVENT_IMAGE_MAX_ZOOM,
  EVENT_IMAGE_MIN_ZOOM,
  eventImageObjectPath,
  eventImageCropTransform,
  isEventImageBackendUnavailable,
  probeEventImageStorage,
  removeEventImageIfUnreferenced,
  validateEventImageFile,
  type EventImageContext,
  type EventImageFit,
  type EventImageValue,
} from '@/lib/eventImage';
import styles from './EventImageEditor.module.css';

interface EventImageEditorProps {
  heading: string;
  context: EventImageContext;
  value: EventImageValue | null;
  onChange: (value: EventImageValue | null) => Promise<void> | void;
}

const unavailableMessage = 'Photo and logo storage is temporarily unavailable in this local environment. You can continue without an image.';
const defaultDisplay = { fit: 'cover' as const, positionX: 50, positionY: 50, zoom: EVENT_IMAGE_MIN_ZOOM };

interface ImageDrag {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPositionX: number;
  startPositionY: number;
}

export const EventImageEditor: React.FC<EventImageEditorProps> = ({ heading, context, value, onChange }) => {
  const contextId = context.kind === 'draft' ? context.draftId : context.eventId;
  const stableContext = React.useMemo<EventImageContext>(() => context.kind === 'draft'
    ? { kind: 'draft', ownerId: context.ownerId, draftId: contextId }
    : { kind: 'event', ownerId: context.ownerId, eventId: contextId }, [context.kind, context.ownerId, contextId]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const currentRef = React.useRef<EventImageValue | null>(value);
  const dragRef = React.useRef<ImageDrag | null>(null);
  const headingId = React.useId();
  const instructionId = React.useId();
  const [current, setCurrent] = React.useState<EventImageValue | null>(value);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [repositioning, setRepositioning] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const next = value ? { ...value, zoom: value.zoom ?? EVENT_IMAGE_MIN_ZOOM } : null;
    currentRef.current = next;
    setCurrent(next);
  }, [value]);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await probeEventImageStorage(stableContext);
        if (!active) return;
        setAvailable(true);
        if (value?.path) setPreviewUrl(await createEventImageSignedUrl(value.path));
      } catch (reason) {
        if (!active) return;
        setAvailable(false);
        setError(isEventImageBackendUnavailable(reason) ? unavailableMessage : 'The image service could not be reached. You can continue without an image.');
      }
    })();
    return () => { active = false; };
  }, [stableContext, value?.path]);

  const choose = () => inputRef.current?.click();

  const acceptFile = async (file?: File) => {
    if (!file || available !== true || busy) return;
    setBusy(true);
    setError('');
    let uploadedPath: string | null = null;
    try {
      const validated = await validateEventImageFile(file);
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error('Your signed-in account could not be verified.');
      if (stableContext.kind === 'draft' && auth.user.id !== stableContext.ownerId) throw new Error('This setup draft does not belong to your account.');

      uploadedPath = eventImageObjectPath(stableContext, validated.mime);
      const { error: uploadError } = await supabase.storage.from(EVENT_IMAGE_BUCKET).upload(uploadedPath, validated.file, {
        contentType: validated.mime,
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const next: EventImageValue = { path: uploadedPath, ...defaultDisplay };
      await onChange(next);
      const oldPath = current?.path;
      setCurrent(next);
      setPreviewUrl(await createEventImageSignedUrl(uploadedPath));
      if (oldPath && oldPath !== uploadedPath) await removeEventImageIfUnreferenced(oldPath);
    } catch (reason) {
      if (uploadedPath) await removeEventImageIfUnreferenced(uploadedPath);
      if (isEventImageBackendUnavailable(reason)) setAvailable(false);
      setError(isEventImageBackendUnavailable(reason) ? unavailableMessage : reason instanceof Error ? reason.message : 'The image could not be uploaded.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const commitDisplay = async (next: EventImageValue) => {
    const previous = currentRef.current;
    currentRef.current = next;
    setCurrent(next);
    try {
      await onChange(next);
    } catch (reason) {
      currentRef.current = previous;
      setCurrent(previous);
      setError(reason instanceof Error ? reason.message : 'The image display settings could not be saved.');
    }
  };

  const setFit = (fit: EventImageFit) => {
    if (currentRef.current) void commitDisplay({ ...currentRef.current, fit });
  };

  const updateCurrent = (next: EventImageValue) => {
    currentRef.current = next;
    setCurrent(next);
  };

  const startRepositioning = (event: React.PointerEvent<HTMLDivElement>) => {
    const image = currentRef.current;
    if (!image || image.fit !== 'cover' || busy || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPositionX: image.positionX,
      startPositionY: image.positionY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setRepositioning(true);
  };

  const reposition = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const image = currentRef.current;
    const frame = previewRef.current;
    if (!drag || !image || !frame || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const bounds = frame.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const scale = clampEventImageZoom(image.zoom) / 100;
    updateCurrent({
      ...image,
      positionX: clampEventImagePosition(drag.startPositionX - ((event.clientX - drag.startClientX) / (bounds.width * scale)) * 100),
      positionY: clampEventImagePosition(drag.startPositionY - ((event.clientY - drag.startClientY) / (bounds.height * scale)) * 100),
    });
  };

  const finishRepositioning = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
    setRepositioning(false);
    if (currentRef.current) void commitDisplay(currentRef.current);
  };

  const repositionWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const image = currentRef.current;
    if (!image || image.fit !== 'cover' || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 2;
    const next = {
      ...image,
      positionX: clampEventImagePosition(image.positionX + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0)),
      positionY: clampEventImagePosition(image.positionY + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)),
    };
    void commitDisplay(next);
  };

  const resetDisplay = () => {
    const image = currentRef.current;
    if (image) void commitDisplay({ ...image, positionX: 50, positionY: 50, zoom: EVENT_IMAGE_MIN_ZOOM });
  };

  const remove = async () => {
    if (!current || busy) return;
    setBusy(true);
    setError('');
    try {
      const oldPath = current.path;
      await onChange(null);
      currentRef.current = null;
      setCurrent(null);
      setPreviewUrl(null);
      await removeEventImageIfUnreferenced(oldPath);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The image could not be removed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.editor} aria-labelledby={headingId}>
      <div className={styles.copy}>
        <h3 id={headingId}>{heading}</h3>
        <p>Personalise your Wedding Waitress experience with a photo or logo. We can use it in more places throughout your planning journey later, and you can replace or remove it at any time.</p>
      </div>
      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept={EVENT_IMAGE_ACCEPT}
        aria-label="Choose an event photo or logo"
        onChange={(event) => void acceptFile(event.target.files?.[0])}
      />

      <div className={styles.workspace}>
        {current && previewUrl ? (
          <div
            ref={previewRef}
            className={styles.preview}
            data-repositionable={current.fit === 'cover'}
            data-repositioning={repositioning}
            role="img"
            tabIndex={current.fit === 'cover' ? 0 : -1}
            aria-label={current.fit === 'cover' ? 'Draggable event image editor' : 'Event logo preview showing the complete logo'}
            aria-describedby={current.fit === 'cover' ? instructionId : undefined}
            onPointerDown={startRepositioning}
            onPointerMove={reposition}
            onPointerUp={finishRepositioning}
            onPointerCancel={finishRepositioning}
            onKeyDown={repositionWithKeyboard}
          >
            <img
              src={previewUrl}
              alt="Event photo or logo preview"
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              style={{
                objectFit: current.fit,
                objectPosition: `${current.positionX}% ${current.positionY}%`,
                transform: eventImageCropTransform(current),
              }}
            />
          </div>
        ) : (
          <div
            className={styles.dropzone}
            data-dragging={dragging}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); void acceptFile(event.dataTransfer.files?.[0]); }}
          >
            <Upload aria-hidden="true" />
            <span>Drag and drop a file here, or</span>
            <button type="button" onClick={choose} disabled={available !== true || busy}>Upload Photo or Logo</button>
            <small>JPG, PNG or WebP—maximum 5 MB.</small>
          </div>
        )}

        {current && (
          <div className={styles.controls} aria-label="Event image controls">
            <div className={styles.fitControls}>
              <span>Display</span>
              <button type="button" aria-pressed={current.fit === 'cover'} onClick={() => setFit('cover')} disabled={busy}><ImageIcon aria-hidden="true" />Fill Frame</button>
              <button type="button" aria-pressed={current.fit === 'contain'} onClick={() => setFit('contain')} disabled={busy}><ImageIcon aria-hidden="true" />Fit Logo</button>
            </div>
            {current.fit === 'cover' && (
              <div className={styles.cropControls}>
                <p id={instructionId}>Click or touch and drag the image to reposition it. Use Zoom to adjust the crop.</p>
                <div className={styles.zoomRow}>
                  <label htmlFor={`${instructionId}-zoom`}>Zoom</label>
                  <input
                    id={`${instructionId}-zoom`}
                    type="range"
                    min={EVENT_IMAGE_MIN_ZOOM}
                    max={EVENT_IMAGE_MAX_ZOOM}
                    value={clampEventImageZoom(current.zoom)}
                    aria-valuetext={`${Math.round(clampEventImageZoom(current.zoom))}%`}
                    onChange={(event) => updateCurrent({ ...currentRef.current!, zoom: clampEventImageZoom(Number(event.target.value)) })}
                    onBlur={() => currentRef.current && void commitDisplay(currentRef.current)}
                    onPointerUp={() => currentRef.current && void commitDisplay(currentRef.current)}
                    onKeyUp={() => currentRef.current && void commitDisplay(currentRef.current)}
                  />
                  <output htmlFor={`${instructionId}-zoom`}>{Math.round(clampEventImageZoom(current.zoom))}%</output>
                  <button type="button" className={styles.resetButton} onClick={resetDisplay} disabled={busy || (current.positionX === 50 && current.positionY === 50 && current.zoom === EVENT_IMAGE_MIN_ZOOM)}>
                    <RotateCcw aria-hidden="true" />Reset Position
                  </button>
                </div>
              </div>
            )}
            {current.fit === 'contain' && <p className={styles.fitMessage}>The complete logo is displayed. Switch to Fill Frame to reposition or zoom.</p>}
            <div className={styles.actions}>
              <button type="button" onClick={choose} disabled={available !== true || busy}><Upload aria-hidden="true" />Replace</button>
              <button type="button" onClick={() => void remove()} disabled={available !== true || busy}><Trash2 aria-hidden="true" />Remove</button>
            </div>
          </div>
        )}
      </div>

      {available === null && <p className={styles.status} aria-live="polite"><Loader2 className={styles.spin} aria-hidden="true" />Checking image storage...</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
};

export const EventImagePreview: React.FC<{ value: EventImageValue; alt?: string }> = ({ value, alt = 'Event photo or logo' }) => {
  const [url, setUrl] = React.useState('');
  const [unavailable, setUnavailable] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    void createEventImageSignedUrl(value.path).then((signedUrl) => { if (active) setUrl(signedUrl); }).catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; };
  }, [value.path]);
  if (unavailable) return <p className={styles.reviewUnavailable}>Photo or logo preview is temporarily unavailable.</p>;
  if (!url) return <div className={styles.reviewLoading} aria-label="Loading event photo or logo" />;
  return <div className={styles.reviewFrame}><img className={styles.reviewImage} src={url} alt={alt} style={{ objectFit: value.fit, objectPosition: `${value.positionX}% ${value.positionY}%`, transform: eventImageCropTransform({ ...value, zoom: value.zoom ?? EVENT_IMAGE_MIN_ZOOM }) }} /></div>;
};
