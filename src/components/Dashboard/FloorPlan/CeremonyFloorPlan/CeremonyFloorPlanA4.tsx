import React from 'react';
import type { Event } from '@/hooks/useEvents';
import { type CeremonyFloorPlan, getDefaultBridalRole } from '@/hooks/useCeremonyFloorPlan';
import { CEREMONY_A4, getCeremonyA4Layout } from '@/lib/ceremonyFloorPlanA4';
import styles from './CeremonyFloorPlanA4.module.css';

const logo = '/wedding-waitress-logo-brown.png';

type Side = 'left' | 'right';

export interface CeremonyFloorPlanA4Props {
  floorPlan: CeremonyFloorPlan;
  event: Event;
  generatedAt: Date;
  onSeatUpdate?: (side: Side, row: number, seat: number, name: string) => Promise<boolean>;
  onBridalPartyUpdate?: (side: Side, index: number, name: string) => Promise<boolean>;
  onBridalPartyRoleUpdate?: (side: Side, index: number, role: string) => Promise<boolean>;
}

interface EditTarget { kind: 'seat' | 'party' | 'role'; side: Side; row?: number; seat?: number; index?: number }

const formatDate = (value?: string | null): string => {
  if (!value) return 'Date TBD';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

const formatTime = (value?: string | null): string => {
  if (!value) return 'Time TBD';
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes));
};

const getPersonName = (saved: string, fallback: string): string => {
  const normalized = saved.trim().toLowerCase();
  return !saved.trim() || normalized === 'groom' || normalized === 'bride' ? fallback : saved;
};

export const CeremonyFloorPlanA4 = React.forwardRef<HTMLDivElement, CeremonyFloorPlanA4Props>(({
  floorPlan,
  event,
  generatedAt,
  onSeatUpdate,
  onBridalPartyUpdate,
  onBridalPartyRoleUpdate,
}, ref) => {
  const [editing, setEditing] = React.useState<EditTarget | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const layout = getCeremonyA4Layout({ chairsPerRow: floorPlan.chairs_per_row, totalRows: floorPlan.total_rows });
  const isGroomLeft = floorPlan.couple_side_arrangement !== 'bride_left';
  const leftCount = Math.min(10, floorPlan.bridal_party_count_left || 0);
  const rightCount = Math.min(10, floorPlan.bridal_party_count_right || 0);
  const familySeats = floorPlan.total_rows * floorPlan.chairs_per_row;
  const totalAttending = 3 + leftCount + rightCount + (familySeats * 2);
  const leftPerson = getPersonName(floorPlan.person_left_name || '', isGroomLeft ? 'Groom' : 'Bride');
  const rightPerson = getPersonName(floorPlan.person_right_name || '', isGroomLeft ? 'Bride' : 'Groom');

  const getRole = (side: Side, index: number): string => {
    const saved = (side === 'left' ? floorPlan.bridal_party_roles_left : floorPlan.bridal_party_roles_right)?.[index];
    const standardRoles = ['Best Man', 'Groomsman', 'Maid of Honor', 'Bridesmaid'];
    if (saved && !standardRoles.includes(saved)) return saved;
    return getDefaultBridalRole(side, index, floorPlan.couple_side_arrangement, side === 'left' ? leftCount : rightCount);
  };

  const beginEdit = (target: EditTarget, value: string) => {
    const enabled = target.kind === 'seat' ? onSeatUpdate : target.kind === 'party' ? onBridalPartyUpdate : onBridalPartyRoleUpdate;
    if (!enabled) return;
    setEditing(target);
    setEditingValue(value);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editing.kind === 'seat' && editing.row && editing.seat && onSeatUpdate) {
      await onSeatUpdate(editing.side, editing.row, editing.seat, editingValue);
    } else if (editing.kind === 'party' && editing.index !== undefined && onBridalPartyUpdate) {
      await onBridalPartyUpdate(editing.side, editing.index, editingValue);
    } else if (editing.kind === 'role' && editing.index !== undefined && onBridalPartyRoleUpdate) {
      await onBridalPartyRoleUpdate(editing.side, editing.index, editingValue);
    }
    setEditing(null);
  };

  const editInput = (label: string) => <input
    autoFocus
    aria-label={label}
    className={styles.editor}
    value={editingValue}
    onChange={(event) => setEditingValue(event.target.value)}
    onBlur={() => void saveEdit()}
    onKeyDown={(event) => {
      if (event.key === 'Enter') void saveEdit();
      if (event.key === 'Escape') setEditing(null);
    }}
  />;

  const renderParty = (side: Side, count: number, label: string) => {
    const names = side === 'left' ? floorPlan.bridal_party_left : floorPlan.bridal_party_right;
    return <section className={styles.party} data-ceremony-party={side}>
      <h3 className={styles.sectionHeading}>{label} ({count})</h3>
      <div className={styles.partyGrid} data-ceremony-party-grid={side} style={{ gridTemplateColumns: `repeat(5, ${layout.seatWidthMm}mm)`, columnGap: `${layout.seatGapMm}mm` }}>
        {Array.from({ length: count }, (_, index) => {
          const name = names?.[index] || '';
          const role = getRole(side, index);
          const editingName = editing?.kind === 'party' && editing.side === side && editing.index === index;
          const editingRole = editing?.kind === 'role' && editing.side === side && editing.index === index;
          return <div className={styles.partyMember} data-ceremony-party-member={`${side}-${index}`} key={`${side}-party-${index}`} style={{ width: `${layout.seatWidthMm}mm` }}>
            <div
              className={`${styles.seat} ${styles.partySeat} ${onBridalPartyUpdate ? styles.editable : ''}`}
              data-ceremony-party-seat={`${side}-${index}`}
              style={{ width: `${layout.seatWidthMm}mm`, height: `${layout.seatHeightMm}mm` }}
              onClick={() => beginEdit({ kind: 'party', side, index }, name)}
              title={name || 'Click to assign'}
            >
              {editingName ? editInput(`${label} ${index + 1} name`) : <span className={styles.seatText}>{name || index + 1}</span>}
            </div>
            <div className={`${styles.role} ${onBridalPartyRoleUpdate ? styles.editable : ''}`} data-ceremony-role={role} style={{ width: `${layout.seatWidthMm}mm` }} onClick={() => beginEdit({ kind: 'role', side, index }, role)} title={role}>
              {editingRole ? editInput(`${label} ${index + 1} role`) : role}
            </div>
          </div>;
        })}
      </div>
    </section>;
  };

  const renderSeat = (side: Side, row: number, seat: number) => {
    const assigned = row <= floorPlan.assigned_rows;
    const name = floorPlan.seat_assignments.find(item => item.side === side && item.row === row && item.seat === seat)?.name || '';
    const isEditing = editing?.kind === 'seat' && editing.side === side && editing.row === row && editing.seat === seat;
    return <div
      className={`${styles.seat} ${assigned && onSeatUpdate ? styles.editable : ''}`}
      data-assigned={assigned}
      data-ceremony-seat={`${side}-${row}-${seat}`}
      data-family-seat="true"
      key={`${side}-${row}-${seat}`}
      style={{ width: `${layout.seatWidthMm}mm`, height: `${layout.seatHeightMm}mm` }}
      onClick={() => assigned && beginEdit({ kind: 'seat', side, row, seat }, name)}
      title={assigned ? name || 'Click to assign' : 'General seating'}
    >
      {isEditing ? editInput(`${side} row ${row} seat ${seat}`) : <span className={styles.seatText}>{name || (floorPlan.show_seat_numbers ? seat : '—')}</span>}
    </div>;
  };

  const renderFamily = (side: Side, label: string) => <section className={styles.family} data-ceremony-family={side}>
    <h3 className={styles.sectionHeading}>{label} ({familySeats})</h3>
    <div className={styles.familyRows} style={{ gap: `${layout.rowGapMm}mm` }}>
      {Array.from({ length: floorPlan.total_rows }, (_, rowIndex) => {
        const row = rowIndex + 1;
        return <React.Fragment key={`${side}-row-${row}`}>
          {row === floorPlan.assigned_rows + 1 && <div className={styles.generalMarker}>General Seating</div>}
          <div className={styles.row} data-ceremony-row={`${side}-${row}`}>
            {floorPlan.show_row_numbers && side === 'left' && <span className={styles.rowNumber} data-row-number="true">{row}</span>}
            <div className={styles.seatRow} style={{ gap: `${layout.seatGapMm}mm` }}>
              {Array.from({ length: floorPlan.chairs_per_row }, (_, seatIndex) => renderSeat(side, row, seatIndex + 1))}
            </div>
            {floorPlan.show_row_numbers && side === 'right' && <span className={styles.rowNumber} data-row-number="true">{row}</span>}
          </div>
        </React.Fragment>;
      })}
    </div>
  </section>;

  const ceremonyDate = event.ceremony_date || event.date;
  const ceremonyVenue = event.ceremony_venue || event.venue || 'Location TBD';
  const ceremonyTimes = `${formatTime(event.ceremony_start_time)} – ${formatTime(event.ceremony_finish_time)}`;
  const generated = `${generatedAt.toLocaleDateString('en-GB')} ${generatedAt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`;

  return <div
    ref={ref}
    className={styles.sheet}
    data-ceremony-a4-renderer="true"
    data-print-mirror-document="ceremony-floor-plan"
    data-print-mirror-paper="A4"
    data-print-mirror-orientation="landscape"
    data-print-mirror-width-mm={CEREMONY_A4.widthMm}
    data-print-mirror-height-mm={CEREMONY_A4.heightMm}
    data-page-size="A4 landscape"
  >
    <header className={styles.header} data-ceremony-a4-header="true">
      <h1 className={styles.eventName}>{event.name}</h1>
      <h2 className={styles.title}>Ceremony Floor Plan</h2>
      <div className={styles.details}>Ceremony: {formatDate(ceremonyDate)} | {ceremonyVenue} | {ceremonyTimes}</div>
      <div className={styles.total}>Total Attending Ceremony: <strong>{totalAttending}</strong> (This includes Bride &amp; Groom + Celebrant + Bridal Party + all Family &amp; Friends)</div>
      <div className={styles.separator} />
    </header>
    <main className={styles.documentBody}>
      <div className={styles.bridalArea}>
        {renderParty('left', leftCount, isGroomLeft ? 'Groomsmen' : 'Bridesmaids')}
        <div className={styles.couple}>
          <div className={styles.person} data-ceremony-person="left" title={leftPerson}>{leftPerson}</div>
          <div className={`${styles.person} ${styles.celebrant}`} data-ceremony-person="celebrant">Celebrant</div>
          <div className={styles.person} data-ceremony-person="right" title={rightPerson}>{rightPerson}</div>
        </div>
        {renderParty('right', rightCount, isGroomLeft ? 'Bridesmaids' : 'Groomsmen')}
      </div>
      <div className={styles.seating} data-ceremony-seating="true">
        {renderFamily('left', floorPlan.left_side_label)}
        <div className={styles.aisle} data-ceremony-aisle="true"><span className={styles.aisleLabel}>Bride's Walkway – Aisle</span></div>
        {renderFamily('right', floorPlan.right_side_label)}
      </div>
    </main>
    <footer className={styles.footer} data-ceremony-a4-footer="true">
      <div className={styles.footerLeft}>Generated: {generated}</div>
      <img src={logo} alt="Wedding Waitress" />
      <div className={styles.footerRight}>Page 1 of 1</div>
    </footer>
  </div>;
});

CeremonyFloorPlanA4.displayName = 'CeremonyFloorPlanA4';

export const CeremonyFloorPlanA4Preview: React.FC<CeremonyFloorPlanA4Props & { pageRef: React.RefObject<HTMLDivElement> }> = ({ pageRef, ...props }) => {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [sheetPixels, setSheetPixels] = React.useState({ width: 1123, height: 794 });
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const sheet = pageRef.current;
    if (!viewport || !sheet) return;
    const resize = () => {
      const width = sheet.offsetWidth || 1123;
      const height = sheet.offsetHeight || 794;
      const fitScale = Math.min(1, viewport.clientWidth / width);
      setSheetPixels({ width, height });
      setScale(Math.max(0.55, fitScale));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [pageRef]);

  return <div ref={viewportRef} className={styles.previewViewport} data-ceremony-preview-viewport="true">
    <div className={styles.previewCanvas} style={{ width: `${sheetPixels.width * scale}px`, height: `${sheetPixels.height * scale}px` }}>
      <div
        className={styles.previewSheet}
        data-print-mirror-presentation="true"
        style={{ width: `${sheetPixels.width}px`, height: `${sheetPixels.height}px`, transform: `scale(${scale})` }}
      >
        <CeremonyFloorPlanA4 ref={pageRef} {...props} />
      </div>
    </div>
  </div>;
};
