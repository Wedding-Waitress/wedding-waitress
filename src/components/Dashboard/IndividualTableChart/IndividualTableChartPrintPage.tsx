import React, { useMemo } from 'react';
import { Guest } from '@/hooks/useGuests';
import { TableWithGuestCount } from '@/hooks/useTables';
import { A4_PAGE_STYLE } from '@/lib/a4';
import { IndividualChartSettings } from './IndividualTableSeatingChartPage';

interface IndividualTableChartPrintPageProps {
  settings: IndividualChartSettings;
  table: TableWithGuestCount;
  guests: Guest[];
  event: any;
  totalTables?: number;
  currentTableIndex?: number;
}

export const GUEST_TEXT_SIZE_PT = { small: 8, standard: 10, large: 12 } as const;
export const RADIAL_TABLE_SIZE_PX = 210;
export const PREVIOUS_RADIAL_TABLE_SIZE_PX = 280;
export const RADIAL_CANVAS_WIDTH_PX = 660;
export const RADIAL_TABLE_CENTER_X_PX = RADIAL_CANVAS_WIDTH_PX / 2;
export const DIAGRAM_SAFE_GAP_MM = 6;
export const FOOTER_CLEARANCE_MM = 6;
export const RADIAL_DIAGRAM_HEIGHT_PX = { small: 420, standard: 450, large: 490 } as const;

const getGuestTextPt = (settings: IndividualChartSettings) =>
  GUEST_TEXT_SIZE_PT[settings.guestTextSize || 'standard'];

const getTextStyle = (settings: IndividualChartSettings): React.CSSProperties => ({
  fontWeight: settings.isBold ? 700 : 400,
  fontStyle: settings.isItalic ? 'italic' : 'normal',
  textDecoration: settings.isUnderline ? 'underline' : 'none',
});

const getOrdinalSuffix = (day: number) => {
  if (day > 3 && day < 21) return 'th';
  if (day % 10 === 1) return 'st';
  if (day % 10 === 2) return 'nd';
  if (day % 10 === 3) return 'rd';
  return 'th';
};

const formatEventDate = (value?: string | null) => {
  if (!value) return 'TBD';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.getDate();
  return `${day}${getOrdinalSuffix(day)} ${date.toLocaleDateString('en-GB', { month: 'long' })} ${date.getFullYear()}`;
};

const formatTime = (value?: string | null) => {
  if (!value) return 'TBD';
  const [hours, minutes = '00'] = value.split(':');
  const hour = Number(hours);
  if (Number.isNaN(hour)) return value;
  return `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const getFooterTimestamp = () => {
  const now = new Date();
  const hour = now.getHours();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:${String(now.getMinutes()).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const sortGuests = (guests: Guest[], tableId: string) => [...guests]
  .filter((guest) => guest.table_id === tableId)
  .sort((a, b) => (a.seat_no || 0) - (b.seat_no || 0));

const getDietaryText = (guest: Guest, settings: IndividualChartSettings) =>
  settings.includeDietary && guest.dietary && guest.dietary !== 'NA' ? guest.dietary : '';

const getRelationshipText = (guest: Guest, settings: IndividualChartSettings) =>
  settings.includeRelation && guest.relation_display && guest.relation_display !== 'Not Assigned'
    ? guest.relation_display.replace(/ \/ /g, '/')
    : '';

const GuestDetails = ({ guest, settings }: { guest: Guest; settings: IndividualChartSettings }) => {
  const dietary = getDietaryText(guest, settings);
  const relationship = getRelationshipText(guest, settings);
  if (!dietary && !relationship) return null;
  return (
    <>
      {dietary && <span data-dietary-text="true" style={{ color: settings.dietaryColor || '#000' }}>{dietary}</span>}
      {dietary && relationship && <span style={{ color: '#000' }}> • </span>}
      {relationship && <span data-relationship-text="true" style={{ color: settings.relationshipColor || '#000' }}>{relationship}</span>}
    </>
  );
};

const GuestLabel = ({ guest, settings, align = 'left', fontSizePt }: {
  guest: Guest;
  settings: IndividualChartSettings;
  align?: 'left' | 'center' | 'right';
  fontSizePt: number;
}) => {
  const hasDetails = Boolean(getDietaryText(guest, settings) || getRelationshipText(guest, settings));
  if (!settings.includeNames && !hasDetails) return null;
  return (
    <div
      data-guest-label="true"
      style={{ color: '#000', fontSize: `${fontSizePt}pt`, lineHeight: 1.2, textAlign: align, overflowWrap: 'anywhere', ...getTextStyle(settings) }}
    >
      {settings.includeNames && <div data-guest-name-text="true" style={{ color: settings.guestNameColor }}>{guest.first_name} {guest.last_name}</div>}
      {hasDetails && <div><GuestDetails guest={guest} settings={settings} /></div>}
    </div>
  );
};

const Seat = ({ number, show, color, size = 30 }: { number: number; show: boolean; color: string; size?: number }) => (
  <div
    data-seat="true"
    style={{
      width: `${size}px`, height: `${size}px`, border: '1px solid #000', borderRadius: '50%',
      background: '#fff', color, boxSizing: 'border-box', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flex: '0 0 auto', fontSize: '8pt', lineHeight: 1,
    }}
  >
    {show ? number : ''}
  </div>
);

type RadialPosition = { seatX: number; seatY: number; labelX: number; labelY: number; width: number; align: 'left' | 'center' | 'right'; transform: string };

const getRoundPosition = (index: number, count: number, centerY: number): RadialPosition => {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const seatX = RADIAL_TABLE_CENTER_X_PX + 132 * cos;
  const seatY = centerY + 132 * sin;
  if (Math.abs(cos) < 0.2) {
    return {
      seatX, seatY, labelX: seatX, labelY: seatY + (sin < 0 ? -22 : 22), width: 126, align: 'center',
      transform: sin < 0 ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
    };
  }
  return {
    seatX, seatY, labelX: seatX + (cos > 0 ? 22 : -22), labelY: seatY, width: 150,
    align: cos > 0 ? 'left' : 'right', transform: cos > 0 ? 'translate(0, -50%)' : 'translate(-100%, -50%)',
  };
};

export const getSquareSideCounts = (count: number): [number, number, number, number] => {
  const base = Math.floor(count / 4);
  const counts: [number, number, number, number] = [base, base, base, base];
  const remainderOrder = [1, 3, 0, 2];
  for (let extra = 0; extra < count % 4; extra += 1) counts[remainderOrder[extra]] += 1;
  return counts;
};

export const getSquarePosition = (index: number, count: number, centerY: number): RadialPosition => {
  const counts = getSquareSideCounts(count);
  let side = 0;
  let position = index;
  while (side < 3 && position >= counts[side]) {
    position -= counts[side];
    side += 1;
  }
  const sideCount = counts[side];
  const along = sideCount === 1 ? 0.5 : position / (sideCount - 1);
  const horizontalLabelX = sideCount <= 2 ? 250 + along * 160 : 70 + along * 520;
  const reversedHorizontalLabelX = sideCount <= 2 ? 410 - along * 160 : 590 - along * 520;
  const horizontalLabelWidth = sideCount <= 2 ? 150 : sideCount === 3 ? 130 : 110;
  const horizontalSeatX = 225 + RADIAL_TABLE_SIZE_PX * ((position + 1) / (sideCount + 1));
  const verticalLabelY = sideCount <= 3
    ? centerY - 85 + along * 170
    : 72 + along * (centerY * 2 - 144);
  if (side === 0) return { seatX: horizontalSeatX, seatY: centerY - 127, labelX: horizontalLabelX, labelY: centerY - 151, width: horizontalLabelWidth, align: 'center', transform: 'translate(-50%, -100%)' };
  if (side === 1) return { seatX: 458, seatY: centerY - 85 + along * 170, labelX: 481, labelY: verticalLabelY, width: 155, align: 'left', transform: 'translate(0, -50%)' };
  if (side === 2) return { seatX: 225 + RADIAL_TABLE_SIZE_PX * ((sideCount - position) / (sideCount + 1)), seatY: centerY + 127, labelX: reversedHorizontalLabelX, labelY: centerY + 151, width: horizontalLabelWidth, align: 'center', transform: 'translate(-50%, 0)' };
  return { seatX: 202, seatY: centerY + 85 - along * 170, labelX: 179, labelY: centerY * 2 - verticalLabelY, width: 155, align: 'right', transform: 'translate(-100%, -50%)' };
};

const RadialTable = ({ settings, table, guests }: { settings: IndividualChartSettings; table: TableWithGuestCount; guests: Guest[] }) => {
  const fontSizePt = getGuestTextPt(settings);
  const diagramHeight = RADIAL_DIAGRAM_HEIGHT_PX[settings.guestTextSize || 'standard'];
  const centerY = diagramHeight / 2;
  return (
    <div data-table-layout={settings.tableShape} data-diagram-height={diagramHeight} data-table-center-x={RADIAL_TABLE_CENTER_X_PX} style={{ position: 'relative', width: `${RADIAL_CANVAS_WIDTH_PX}px`, minWidth: `${RADIAL_CANVAS_WIDTH_PX}px`, height: `${diagramHeight}px`, flex: '0 0 auto' }}>
      <div style={{
        position: 'absolute', left: `${RADIAL_TABLE_CENTER_X_PX}px`, top: `${centerY}px`, transform: 'translate(-50%, -50%)',
        width: `${RADIAL_TABLE_SIZE_PX}px`, height: `${RADIAL_TABLE_SIZE_PX}px`, boxSizing: 'border-box',
        border: '1px solid #000', borderRadius: settings.tableShape === 'round' ? '50%' : '4px',
        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
      }}>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '16pt', lineHeight: 1.35 }}>
          <div>TABLE</div><div>{table.table_no ?? table.name}</div>
        </div>
      </div>
      {guests.map((guest, index) => {
        const position = settings.tableShape === 'round'
          ? getRoundPosition(index, guests.length, centerY)
          : getSquarePosition(index, guests.length, centerY);
        return (
          <React.Fragment key={guest.id}>
            <div style={{ position: 'absolute', left: `${position.seatX}px`, top: `${position.seatY}px`, transform: 'translate(-50%, -50%)' }}>
              <Seat number={guest.seat_no || index + 1} show={settings.showSeatNumbers} color={settings.seatNumberColor} />
            </div>
            <div style={{ position: 'absolute', left: `${position.labelX}px`, top: `${position.labelY}px`, width: `${position.width}px`, transform: position.transform }}>
              <GuestLabel guest={guest} settings={settings} align={position.align} fontSizePt={fontSizePt} />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

const LongTable = ({ settings, table, guests }: { settings: IndividualChartSettings; table: TableWithGuestCount; guests: Guest[] }) => {
  const endCount = settings.enableEndSeats ? Math.min(2, guests.length) : 0;
  const sideGuests = guests.slice(0, guests.length - endCount);
  const endGuests = guests.slice(guests.length - endCount);
  const half = Math.ceil(sideGuests.length / 2);
  const left = sideGuests.slice(0, half);
  const right = sideGuests.slice(half);
  const requested = getGuestTextPt(settings);
  const reduction = guests.length > 80 ? 4 : guests.length > 60 ? 3 : guests.length > 40 ? 2 : 0;
  const fontSizePt = Math.max(8, requested - reduction);
  const seatSize = guests.length > 60 ? 24 : guests.length > 40 ? 26 : 30;
  const side = (items: Guest[], isLeft: boolean) => (
    <div style={{ width: '245px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
      {items.map((guest, index) => (
        <div key={guest.id} style={{ display: 'flex', alignItems: 'center', justifyContent: isLeft ? 'flex-end' : 'flex-start', gap: '7px', minHeight: `${seatSize}px` }}>
          {isLeft && <div style={{ width: '205px' }}><GuestLabel guest={guest} settings={settings} align="right" fontSizePt={fontSizePt} /></div>}
          <Seat number={guest.seat_no || (isLeft ? index + 1 : half + index + 1)} show={settings.showSeatNumbers} color={settings.seatNumberColor} size={seatSize} />
          {!isLeft && <div style={{ width: '205px' }}><GuestLabel guest={guest} settings={settings} fontSizePt={fontSizePt} /></div>}
        </div>
      ))}
    </div>
  );
  return (
    <div data-table-layout="long" style={{ height: '100%', minHeight: '430px', padding: '58px 0', boxSizing: 'border-box', display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: '10px' }}>
      {side(left, true)}
      <div style={{ width: '110px', border: '1px solid #000', borderRadius: '4px', position: 'relative', color: '#000', flex: '0 0 auto' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontWeight: 700, fontSize: '16pt' }}>TABLE&nbsp;&nbsp;{table.table_no ?? table.name}</div>
        </div>
        {endGuests[0] && <div style={{ position: 'absolute', left: '50%', top: '-6px', transform: 'translate(-50%, -100%)', width: '180px', textAlign: 'center' }}><GuestLabel guest={endGuests[0]} settings={settings} align="center" fontSizePt={fontSizePt} /><div style={{ display: 'flex', justifyContent: 'center', marginTop: '5px' }}><Seat number={endGuests[0].seat_no || sideGuests.length + 1} show={settings.showSeatNumbers} color={settings.seatNumberColor} size={seatSize} /></div></div>}
        {endGuests[1] && <div style={{ position: 'absolute', left: '50%', bottom: '-6px', transform: 'translate(-50%, 100%)', width: '180px', textAlign: 'center' }}><div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5px' }}><Seat number={endGuests[1].seat_no || sideGuests.length + 2} show={settings.showSeatNumbers} color={settings.seatNumberColor} size={seatSize} /></div><GuestLabel guest={endGuests[1]} settings={settings} align="center" fontSizePt={fontSizePt} /></div>}
      </div>
      {side(right, false)}
    </div>
  );
};

const GuestList = ({ guests, settings }: { guests: Guest[]; settings: IndividualChartSettings }) => {
  if (!settings.includeGuestList || settings.tableShape === 'long') return null;
  const fontSizePt = getGuestTextPt(settings);
  const entry = (guest: Guest) => {
    const actualIndex = guests.findIndex((item) => item.id === guest.id);
    const hasDetails = Boolean(getDietaryText(guest, settings) || getRelationshipText(guest, settings));
    return (
      <div key={guest.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: '5px', marginBottom: '4px', breakInside: 'avoid' }}>
        <span style={{ color: settings.guestListColor }}>{actualIndex + 1}.</span>
        <span style={{ ...getTextStyle(settings), color: settings.guestListColor }}>
          <span data-guest-list-text="true">{guest.first_name} {guest.last_name}</span>
          {hasDetails && <><span style={{ color: '#000' }}> — </span><GuestDetails guest={guest} settings={settings} /></>}
        </span>
      </div>
    );
  };
  const pairs = Array.from({ length: Math.ceil(guests.length / 2) }, (_, rowIndex) => guests.slice(rowIndex * 2, rowIndex * 2 + 2));
  return (
    <div data-guest-list="true" data-layout="paired-rows" style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: settings.guestListColor, fontSize: `${fontSizePt}pt`, lineHeight: 1.25, width: '100%' }}>
      {pairs.map((pair, rowIndex) => (
        <div key={pair[0].id} data-guest-pair={`${rowIndex * 2 + 1}-${rowIndex * 2 + 2}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '20px', alignItems: 'start' }}>
          {entry(pair[0])}
          {pair[1] ? entry(pair[1]) : <div />}
        </div>
      ))}
    </div>
  );
};

export const IndividualTableChartPrintPage: React.FC<IndividualTableChartPrintPageProps> = ({
  settings, table, guests, event, totalTables = 1, currentTableIndex = 1,
}) => {
  const sortedGuests = useMemo(() => sortGuests(guests, table.id), [guests, table.id]);
  const ceremonyLine = event?.ceremony_date
    ? `Ceremony: ${formatEventDate(event.ceremony_date)} | ${event?.ceremony_venue || 'Venue TBD'} | ${formatTime(event?.ceremony_start_time)} – ${formatTime(event?.ceremony_finish_time)}`
    : '';
  const receptionLine = `Reception: ${formatEventDate(event?.date)} | ${event?.venue || 'Venue TBD'} | ${formatTime(event?.start_time)} – ${formatTime(event?.finish_time)}`;

  return (
    <div data-individual-table-chart-page="true" data-page-size="A4" style={{ ...A4_PAGE_STYLE, boxSizing: 'border-box', overflow: 'hidden', background: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ height: '100%', padding: '8mm 12.7mm 10mm', boxSizing: 'border-box', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto', gap: '8px' }}>
        <header style={{ textAlign: 'center', color: '#000' }}>
          <div style={{ fontSize: '16pt', fontWeight: 700, lineHeight: 1.25, overflowWrap: 'anywhere' }}>{event?.name || 'Event'}</div>
          <div style={{ fontSize: '11pt', marginTop: '3px' }}>Individual Table Charts – {sortedGuests.length} {sortedGuests.length === 1 ? 'Guest' : 'Guests'}</div>
          <div style={{ fontSize: '8pt', lineHeight: 1.35, marginTop: '5px', overflowWrap: 'anywhere' }}>{ceremonyLine && <div>{ceremonyLine}</div>}<div>{receptionLine}</div></div>
          <div data-header-separator="true" style={{ borderTop: '1px solid #000', marginTop: '7px' }} />
        </header>

        <main data-content-safe-zone="true" style={{ minHeight: 0, display: 'grid', gridTemplateRows: 'minmax(0, 1fr) auto', gap: '6mm', paddingBottom: `${FOOTER_CLEARANCE_MM}mm`, boxSizing: 'border-box', overflow: 'hidden' }}>
          {settings.tableShape === 'long'
            ? <LongTable settings={settings} table={table} guests={sortedGuests} />
            : <><div data-diagram-safe-region="true" style={{ minHeight: 0, padding: `${DIAGRAM_SAFE_GAP_MM}mm 0`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><RadialTable settings={settings} table={table} guests={sortedGuests} /></div><GuestList settings={settings} guests={sortedGuests} /></>}
        </main>

        <footer data-footer-layout="three-column" data-footer-alignment="single-line-centred" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', minHeight: '12mm', color: '#000', fontSize: '8pt', lineHeight: 1 }}>
          <div data-footer-generated="true" style={{ justifySelf: 'start', alignSelf: 'center', whiteSpace: 'nowrap', fontSize: '8pt' }}>Generated: {getFooterTimestamp()}</div>
          {settings.showLogo
            ? <img src="/wedding-waitress-logo-brown.png" alt="Wedding Waitress" style={{ width: '36mm', height: '10mm', alignSelf: 'center', objectFit: 'contain' }} />
            : <div style={{ width: '36mm', height: '10mm' }} />}
          <div data-footer-page-number="true" style={{ justifySelf: 'end', alignSelf: 'center', whiteSpace: 'nowrap', fontSize: '8pt' }}>Page {currentTableIndex} of {totalTables}</div>
        </footer>
      </div>
    </div>
  );
};
