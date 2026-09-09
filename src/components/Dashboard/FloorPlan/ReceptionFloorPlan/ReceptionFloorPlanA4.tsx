import {receptionHeaderStats} from '@/lib/receptionHeaderStats';
import React from 'react';

import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { A4_MM, A4_PX } from '@/lib/a4';

import styles from './ReceptionFloorPlanA4.module.css';

const logo = '/wedding-waitress-logo-brown.png';

export const RECEPTION_A4 = {
  widthMm: A4_MM.height,
  heightMm: A4_MM.width,
  widthPx: A4_PX.height,
  heightPx: A4_PX.width,
  printableWidthPx: A4_PX.height - 38,
  printableHeightPx: A4_PX.width - 30 - 82 - 34,
} as const;

export interface ReceptionA4Event {
  name: string;
  date?: string | null;
  venue?: string | null;
  start_time?: string | null;
  finish_time?: string | null;
}

export interface ReceptionFloorPlanA4Props {
  pageRef: React.RefObject<HTMLDivElement>;
  fitViewport?: boolean;
  event: ReceptionA4Event;
  plan: ReceptionFloorPlan;
  attendingCount: number;
  tables?: {id:string; table_purpose?: string; guest_count: number}[];
  generatedAt: Date;
  roomWidthPx: number;
  roomHeightPx: number;
  children: React.ReactNode;
  noteLines?: string[];
  pageNumber?: number;
  pageCount?: number;
}

const formatDate = (value?: string | null): string => {
  if (!value) return 'Date TBD';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const formatTime = (value?: string | null): string => {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes));
};

export const getReceptionRoomFit = (
  transformedDrawingWidthPx: number,
  transformedDrawingHeightPx: number,
) => {
  const sourceWidth = transformedDrawingWidthPx + 4;
  const sourceHeight = transformedDrawingHeightPx + 4;
  const scale = Math.min(
    RECEPTION_A4.printableWidthPx / sourceWidth,
    RECEPTION_A4.printableHeightPx / sourceHeight,
  );

  return {
    scale,
    width: sourceWidth * scale,
    height: sourceHeight * scale,
  };
};

export const ReceptionFloorPlanA4 = ({
  pageRef,
  event,
  plan,
  attendingCount,
  tables = [],
  generatedAt,
  roomWidthPx,
  roomHeightPx,
  children,
  noteLines,
  pageNumber = 1,
  pageCount = 1,
}: ReceptionFloorPlanA4Props) => {
  const roomFit = React.useMemo(
    () => getReceptionRoomFit(roomWidthPx, roomHeightPx),
    [roomHeightPx, roomWidthPx],
  );
  const stats = receptionHeaderStats(tables, plan.table_positions);
  const times = [formatTime(event.start_time), formatTime(event.finish_time)]
    .filter(Boolean)
    .join(' – ');
  const details = [formatDate(event.date), event.venue || 'Venue TBD', times]
    .filter(Boolean)
    .join(' | ');
  const generated = `${generatedAt.toLocaleDateString('en-AU')} ${generatedAt.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  return (
    <div
      ref={pageRef}
      className={styles.sheet}
      data-reception-a4-renderer="true"
      data-print-mirror-document="reception-floor-plan"
      data-print-mirror-paper="A4"
      data-print-mirror-orientation="landscape"
      data-print-mirror-width-mm={RECEPTION_A4.widthMm}
      data-print-mirror-height-mm={RECEPTION_A4.heightMm}
      data-page-size="A4 landscape"
    >
      <header className={styles.header} data-reception-a4-header="true">
        <h1>{event.name}</h1>
        <h2>Reception Floor Plan</h2>
        <p>{details}</p>
        <p>
          Head table: <strong>{stats.headPlaced}/{stats.headTotal}</strong>
          {' · '}Tables: <strong>{stats.tablesPlaced}/{stats.tablesTotal}</strong>
          {' · '}Total Attending Reception: <strong>{stats.guestsPlaced}/{stats.guestsTotal}</strong>
        </p>
        <div className={styles.separator} />
      </header>

      {noteLines ? <div className={styles.notesBody} data-reception-notes-page="true">{noteLines.map((line, index) => <div key={index}>{line || '\u00a0'}</div>)}</div> : <main className={styles.documentBody} data-reception-a4-room-stage="true">
        <div
          className={styles.roomFrame}
          data-reception-room-fit="true"
          data-reception-fit-strategy="maximum-proportional-contain"
          data-room-fit-scale={roomFit.scale}
          data-transformed-drawing-width-px={roomWidthPx}
          data-transformed-drawing-height-px={roomHeightPx}
          style={{ width: roomFit.width, height: roomFit.height }}
        >
          <div
            className={styles.roomTransform}
            data-reception-room-transform="true"
            style={{
              width: roomWidthPx + 4,
              height: roomHeightPx + 4,
              transform: `scale(${roomFit.scale})`,
            }}
          >
            {children}
          </div>
        </div>
      </main>}

      <footer className={styles.footer} data-reception-a4-footer="true">
        <span>Generated: {generated}</span>
        <img src={logo} alt="Wedding Waitress" />
        <span>Page {pageNumber} of {pageCount}</span>
      </footer>
    </div>
  );
};

export interface ReceptionFloorPlanA4PreviewProps extends Omit<ReceptionFloorPlanA4Props, 'pageRef'> {
  pageRef: React.RefObject<HTMLDivElement>;
}

export const ReceptionFloorPlanA4Preview = ({
  pageRef,
  fitViewport = false,
  ...props
}: ReceptionFloorPlanA4PreviewProps) => {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [sheetPixels, setSheetPixels] = React.useState({
    width: RECEPTION_A4.widthPx,
    height: RECEPTION_A4.heightPx,
  });
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const sheet = pageRef.current;
    if (!viewport || !sheet) return;

    const resize = () => {
      const width = sheet.offsetWidth || RECEPTION_A4.widthPx;
      const height = sheet.offsetHeight || RECEPTION_A4.heightPx;
      const availableHeight = Math.max(180, window.innerHeight - (viewport.getBoundingClientRect().top + window.scrollY) - 52);
      const fitScale = fitViewport ? Math.min(viewport.clientWidth / width, availableHeight / height) : Math.min(1, viewport.clientWidth / width);
      setSheetPixels({ width, height });
      setScale(Math.max(fitViewport ? 0.1 : 0.45, fitScale));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, [pageRef, fitViewport]);

  const notes = paginateReceptionNotes(props.plan);
  const pageCount = 1 + notes.length;
  return (
    <div
      data-reception-document-group="true"
      ref={viewportRef}
      className={styles.previewViewport}
      data-reception-a4-preview-viewport="true"
    >
      <div
        className={styles.previewCanvas}
        style={{
          width: sheetPixels.width * scale,
          height: (sheetPixels.height * pageCount + 16 * notes.length) * scale,
        }}
      >
        <div
          className={styles.previewSheet}
          data-print-mirror-presentation="true"
          style={{
            width: sheetPixels.width,
            height: sheetPixels.height * pageCount + 16 * notes.length,
            transform: `scale(${scale})`,
          }}
        >
          <ReceptionFloorPlanA4 pageRef={pageRef} {...props} pageCount={1} />
          {notes.map((lines, index) => <div key={index} className={styles.notesSheetGap}><ReceptionFloorPlanA4 {...props} pageRef={{ current: null }} noteLines={lines} pageNumber={index + 1} pageCount={notes.length} /></div>)}
        </div>
      </div>
    </div>
  );
};

/** Wrap notes before pagination so no entered lines are clipped in print. */
export function paginateReceptionNotes(plan: ReceptionFloorPlan): string[][] {
  const sections: string[] = [];
  if (plan.vendor_notes?.trim()) sections.push('Vendor setup notes', plan.vendor_notes);
  for (const table of plan.table_positions) if (table.note?.trim()) sections.push((table.table_name || 'Table ' + (table.table_no ?? '')) + ':', table.note);
  const lines = sections.join('\n\n').split('\n').flatMap(line => line.match(/.{1,100}/gu) || ['']);
  if (!sections.length) return [];
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 38) pages.push(lines.slice(index, index + 38));
  return pages;
}
