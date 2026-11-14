import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { FileDown, Files } from 'lucide-react';
import { savePdfAsync } from '@/lib/pdfExportUtils';
import { createDietaryCardsPdf } from '@/lib/dietaryCardsPdfExporter';
import css from './DietaryCards.css?inline';

export interface DietaryCardGuest {
  id: string; first_name: string; last_name: string; dietary: string;
  table_display: string; seat_no: number | null;
}

export function dietaryCardPages(guests: DietaryCardGuest[]): DietaryCardGuest[][] {
  const eligible = guests.filter(g => g.dietary && !['', 'na', 'n/a', 'none'].includes(g.dietary.trim().toLowerCase()));
  return Array.from({ length: Math.ceil(eligible.length / 6) }, (_, page) => eligible.slice(page * 6, page * 6 + 6));
}

export function dietaryCardLocation(guest: DietaryCardGuest): string {
  const table = guest.table_display?.trim();
  return `${table && table !== '-' ? `Table ${table}` : 'Table unassigned'} · ${guest.seat_no != null ? `Seat ${guest.seat_no}` : 'Seat unassigned'}`;
}

/** A single physical A4 renderer is shared by the on-screen preview and PDF. */
export function DietaryCardsSheet({ guests, eventName, pageIndex, totalPages, sheetRef, onFit }: {
  guests: DietaryCardGuest[]; eventName: string; pageIndex: number; totalPages: number;
  sheetRef: React.RefObject<HTMLDivElement>; onFit?: (overflow: boolean) => void;
}) {
  useLayoutEffect(() => {
    // The parent opens the native dialog in its own layout effect. Measure on
    // the next frame, once the sheet has physical dimensions.
    const frame = requestAnimationFrame(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    let anyOverflow = false;
    sheet.querySelectorAll<HTMLElement>('.ww-dietary-card').forEach(card => {
      let overflow = false;
      card.querySelectorAll<HTMLElement>('.ww-dietary-card-face').forEach(face => {
        const content = face.querySelector<HTMLElement>('.ww-dietary-card-content')!;
        const dietary = face.querySelector<HTMLElement>('.ww-dietary-card-dietary')!;
        const name = face.querySelector<HTMLElement>('.ww-dietary-card-name')!;
        let size = 19;
        dietary.style.fontSize = `${size}pt`; name.style.fontSize = '13pt';
        // Reserve room for the heading's one-line upward offset on both faces.
        const available = () => face.clientHeight - 6 * 96 / 25.4 - 2 * parseFloat(getComputedStyle(dietary).fontSize) * 1.12;
        while (content.offsetHeight > available() + 1 && size > 9) {
          size -= .5; dietary.style.fontSize = `${size}pt`;
          name.style.fontSize = `${Math.max(8, 13 - (19 - size) / 3)}pt`;
        }
        overflow ||= content.offsetHeight > available() + 1;
      });
      card.dataset.cardOverflow = String(overflow); anyOverflow ||= overflow;
    });
    onFit?.(anyOverflow);
    });
    return () => cancelAnimationFrame(frame);
  }, [guests, eventName, pageIndex, sheetRef, onFit]);
  return <div ref={sheetRef} className="ww-dietary-cards-sheet" data-page={pageIndex} data-print-mirror-document="dietary-cards">
    {guests.map(guest => <div key={guest.id} className="ww-dietary-card" data-guest-id={guest.id}>
      {[0, 1].map(face => <div key={face} className="ww-dietary-card-face"><div className="ww-dietary-card-content">
        <div className="ww-dietary-card-dietary">{guest.dietary.trim()}</div>
        <div className="ww-dietary-card-name">{[guest.first_name, guest.last_name].filter(Boolean).join(' ')}</div>
        <div className="ww-dietary-card-seat">{dietaryCardLocation(guest)}</div>
      </div></div>)}
      <div className="ww-dietary-card-fold" aria-hidden="true"/>
    </div>)}
    <div aria-hidden="true" className="ww-dietary-cards-cut-guide ww-dietary-cards-cut-guide-vertical"/>
    <div aria-hidden="true" className="ww-dietary-cards-cut-guide ww-dietary-cards-cut-guide-horizontal" style={{ top: '99mm' }}/>
    <div aria-hidden="true" className="ww-dietary-cards-cut-guide ww-dietary-cards-cut-guide-horizontal" style={{ top: '198mm' }}/>
  </div>;
}

export function DietaryCards({ guests, eventId, eventName, disabled = false }: {
  guests: DietaryCardGuest[]; eventId: string; eventName: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false), [pageIndex, setPageIndex] = useState(0);
  const [exporting, setExporting] = useState(false), [overflow, setOverflow] = useState(false);
  const [error, setError] = useState(''), [scale, setScale] = useState(.75);
  const dialogRef = useRef<HTMLDialogElement>(null), sheetRef = useRef<HTMLDivElement>(null), stageRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false), triggerRef = useRef<HTMLButtonElement>(null);
  const pages = useMemo(() => dietaryCardPages(guests), [guests]);
  const context = JSON.stringify([eventId, eventName, guests]);
  const currentContext = useRef(context); currentContext.current = context;
  const currentPage = Math.min(pageIndex, Math.max(0, pages.length - 1));

  useLayoutEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    const resize = () => setScale(Math.min(1, Math.max(.1, ((stageRef.current?.clientWidth || 340) - 40) / (210 * 96 / 25.4))));
    resize(); const observer = new ResizeObserver(resize); if (stageRef.current) observer.observe(stageRef.current);
    return () => { observer.disconnect(); dialog?.close(); triggerRef.current?.focus(); };
  }, [open]);
  React.useEffect(() => { setPageIndex(0); setError(''); }, [context]);
  React.useEffect(() => { setOpen(false); }, [eventId]);

  const showPage = async (index: number) => {
    flushSync(() => setPageIndex(index));
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  };
  const download = async () => {
    if (busyRef.current || disabled || !pages.length || overflow) return;
    busyRef.current = true; setExporting(true); setError('');
    const snapshot = currentContext.current, originalPage = currentPage;
    const assertContext = () => { if (snapshot !== currentContext.current) throw new Error('The guest list changed while preparing the cards. Please download them again.'); };
    try {
      const pdf = await createDietaryCardsPdf({ getSheet: () => sheetRef.current, showPage, currentPage: originalPage, totalPages: pages.length, assertContext });
      assertContext();
      const safeName = eventName.replace(/[/:*?"<>|\\]/g, '').trim() || 'Wedding';
      await savePdfAsync(pdf, `${safeName}-Dietary Cards-A4.pdf`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The cards could not be downloaded. Please try again.'); }
    finally { busyRef.current = false; setExporting(false); }
  };
  const close = () => { if (!busyRef.current) setOpen(false); };
  return <>
    <style>{css}</style>
    <button ref={triggerRef} type="button" className="ww-dietary-cards-action" disabled={disabled || !pages.length} onClick={() => { setPageIndex(0); setError(''); setOpen(true); }}>
      <Files strokeWidth={1.8} aria-hidden="true"/><span>Dietary Cards</span>
    </button>
    {open && createPortal(<dialog ref={dialogRef} className="ww-dietary-cards-dialog" aria-labelledby="ww-dietary-cards-title" aria-describedby="ww-dietary-cards-description" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } }}>
      <div className="ww-dietary-cards-heading"><div><h2 id="ww-dietary-cards-title">Dietary Cards</h2><p>{eventName} · {guests.length} guest{guests.length !== 1 ? 's' : ''}</p></div><button autoFocus type="button" className="ww-dietary-cards-close" disabled={exporting} onClick={close}>Close</button></div>
      <div className="ww-dietary-cards-tools"><div className="ww-dietary-cards-nav" aria-label="Dietary card sheets">
        <button type="button" disabled={exporting || currentPage === 0} onClick={() => setPageIndex(currentPage - 1)}>Previous</button>
        <span aria-live="polite">Sheet {pages.length ? currentPage + 1 : 0} of {pages.length}</span>
        <button type="button" disabled={exporting || currentPage + 1 >= pages.length} onClick={() => setPageIndex(currentPage + 1)}>Next</button>
      </div><button type="button" className="ww-dietary-cards-action" disabled={disabled || exporting || overflow || !pages.length} onClick={() => void download()}><FileDown strokeWidth={1.8} aria-hidden="true"/><span>{exporting ? 'Preparing cards…' : 'Download Cards PDF'}</span></button></div>
      <p id="ww-dietary-cards-description" className="ww-dietary-cards-help">A4 portrait (210 × 297 mm) · Six cards per sheet · Full card 105 × 99 mm · Folded size 105 × 49.5 mm, matching Name Place Cards.<br/>Cut along the solid lines between cards. Fold each card along its dashed centre. Print at 100% / Actual size. Guest details update automatically from your Guest List.</p>
      {(error || overflow) && <p role="alert" className="ww-dietary-cards-error">{error || 'A highlighted card has more text than will fit. Review its guest details in the Guest List before downloading; dietary information is never cut off.'}</p>}
      <div ref={stageRef} className="ww-dietary-cards-stage" aria-busy={exporting}>
        {pages.length ? <div className="ww-dietary-cards-scaled-space" style={{ width: 210 * 96 / 25.4 * scale, height: 297 * 96 / 25.4 * scale }}>
          <div className="ww-dietary-cards-scale" data-print-mirror-presentation="true" style={{ transform: `scale(${scale})` }}>
            <DietaryCardsSheet sheetRef={sheetRef} guests={pages[currentPage]} eventName={eventName} pageIndex={currentPage} totalPages={pages.length} onFit={setOverflow}/>
          </div>
        </div> : <p>No guests with dietary requirements are available.</p>}
      </div>
    </dialog>, document.body)}
  </>;
}
