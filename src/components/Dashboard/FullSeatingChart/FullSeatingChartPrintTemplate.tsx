import React from 'react';
import { Guest } from '@/hooks/useGuests';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { normalizeRsvp } from '@/lib/rsvp';


interface FullSeatingChartPrintTemplateProps {
  event: any;
  guests: Guest[];
  settings: FullSeatingChartSettings;
}

export const FullSeatingChartPrintTemplate: React.FC<FullSeatingChartPrintTemplateProps> = ({
  event,
  guests,
  settings
}) => {
  const formatGuestName = (guest: Guest) => {
    if (settings.sortBy === 'lastName') {
      return `${guest.last_name || ''}, ${guest.first_name}`.trim();
    }
    return `${guest.first_name} ${guest.last_name || ''}`.trim();
  };

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formatDateWithOrdinal = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const ordinal = getOrdinalSuffix(day);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `${weekday} ${day}${ordinal}, ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  const formatGeneratedDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Font size mapping to match PDF output
  const fontSizeMap = {
    small: { name: '10.5pt', details: '9.5pt', lineHeight: 1.2, rowHeightMM: 5 },
    medium: { name: '12pt', details: '11pt', lineHeight: 1.2, rowHeightMM: 6 },
    large: { name: '13.5pt', details: '12.5pt', lineHeight: 1.2, rowHeightMM: 7 }
  };
  const currentFontSize = fontSizeMap[settings.fontSize];

  // Calculate pagination
  const pageHeightMM = 297; // A4 height
  const topMarginMM = 10;
  const bottomMarginMM = 10;
  const headerHeightMM = 35;
  const footerHeightMM = 30;
  const availableHeightMM = pageHeightMM - topMarginMM - bottomMarginMM - headerHeightMM - footerHeightMM;
  
  // Calculate rows per column based on font size and available height
  const rowHeightMM = currentFontSize.rowHeightMM;
  const rowsPerColumn = Math.floor(availableHeightMM / rowHeightMM);
  const rowsPerPage = rowsPerColumn * 2; // Two columns per page

  // Split guests into pages
  const pages: Guest[][] = [];
  for (let i = 0; i < guests.length; i += rowsPerPage) {
    pages.push(guests.slice(i, i + rowsPerPage));
  }

  const renderGuestRow = (guest: Guest) => {
    const guestName = formatGuestName(guest);
    const tableInfo = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
    
    return (
      <div key={guest.id} style={{ marginBottom: '1.5mm', breakInside: 'avoid' }}>
        {/* Name line with checkbox and table */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          fontSize: currentFontSize.name,
          lineHeight: currentFontSize.lineHeight
        }}>
          <div style={{ 
            width: '3mm', 
            height: '3mm', 
            border: '0.3mm solid #000',
            marginRight: '3mm',
            flexShrink: 0
          }}></div>
          <span style={{ fontWeight: 'bold', flex: 1 }}>{guestName}</span>
          <span style={{ fontWeight: 'normal', marginLeft: '2mm' }}>{tableInfo}</span>
        </div>

        {/* Details */}
        <div style={{ marginLeft: '6mm' }}>
          {settings.showDietary && guest.dietary && (
            <div style={{ 
              fontSize: currentFontSize.details,
              color: '#2563eb',
              lineHeight: currentFontSize.lineHeight
            }}>
              Dietary: {guest.dietary}
            </div>
          )}
          {settings.showRsvp && guest.rsvp && (
            <div style={{ 
              fontSize: currentFontSize.details,
              color: normalizeRsvp(guest.rsvp) === 'Attending' ? '#22c55e' :
                     normalizeRsvp(guest.rsvp) === 'Not Attending' ? '#ef4444' : '#f59e0b',
              lineHeight: currentFontSize.lineHeight
            }}>
              RSVP: {normalizeRsvp(guest.rsvp)}
            </div>
          )}
          {settings.showRelation && guest.relation_display && (
            <div style={{ 
              fontSize: currentFontSize.details,
              color: '#8B5CF6',
              lineHeight: currentFontSize.lineHeight
            }}>
              Relation: {guest.relation_display}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @page {
          margin: 0;
          size: A4;
        }
        @media print {
          body {
            margin: 0;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>
      
      {pages.map((pageGuests, pageIndex) => {
        const midPoint = Math.ceil(pageGuests.length / 2);
        const leftColumn = pageGuests.slice(0, midPoint);
        const rightColumn = pageGuests.slice(midPoint);
        const startGuestNum = pages.slice(0, pageIndex).reduce((sum, p) => sum + p.length, 0) + 1;
        const endGuestNum = startGuestNum + pageGuests.length - 1;

        return (
          <div 
            key={pageIndex}
            id={`full-seating-print-content-page-${pageIndex}`}
            className={`hidden print:block ${pageIndex < pages.length - 1 ? 'page-break' : ''}`}
            style={{
              position: 'relative',
              width: '210mm',
              minHeight: '297mm',
              padding: '10mm',
              boxSizing: 'border-box',
              background: '#ffffff',
              fontFamily: 'Arial, Helvetica, sans-serif',
              pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto'
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '8mm' }}>
              <h1 style={{ 
                fontSize: '18pt', 
                fontWeight: 'bold', 
                color: '#8B5CF6',
                margin: '0 0 4pt 0'
              }}>
                {event.name}
              </h1>
              <p style={{ 
                fontSize: '12pt', 
                margin: '0',
                color: '#000000'
              }}>
                {event.date && formatDateWithOrdinal(event.date)}
                {event.date && event.venue && ' - '}
                {event.venue && event.venue}
                {(event.date || event.venue) && ' - '}
                Full Seating Chart
              </p>
            </div>

            {/* Column Headers */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '4mm'
            }}>
              <div style={{ width: 'calc(50% - 5mm)' }}>
                <div style={{ 
                  fontSize: '9pt', 
                  fontWeight: 'bold',
                  marginBottom: '2mm'
                }}>
                  GUESTS {startGuestNum}-{startGuestNum + leftColumn.length - 1}
                </div>
                <div style={{ 
                  borderBottom: '0.3mm solid #000', 
                  marginBottom: '3mm' 
                }}></div>
              </div>
              <div style={{ width: 'calc(50% - 5mm)' }}>
                <div style={{ 
                  fontSize: '9pt', 
                  fontWeight: 'bold',
                  marginBottom: '2mm'
                }}>
                  GUESTS {startGuestNum + leftColumn.length}-{endGuestNum}
                </div>
                <div style={{ 
                  borderBottom: '0.3mm solid #000', 
                  marginBottom: '3mm' 
                }}></div>
              </div>
            </div>

            {/* Guest List - Two Columns */}
            <div style={{ 
              display: 'flex', 
              gap: '10mm',
              marginBottom: '10mm'
            }}>
              {/* Left Column */}
              <div style={{ flex: 1 }}>
                {leftColumn.map((guest) => renderGuestRow(guest))}
              </div>

              {/* Right Column */}
              <div style={{ flex: 1 }}>
                {rightColumn.map((guest) => renderGuestRow(guest))}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              position: 'absolute',
              bottom: '10mm',
              left: '10mm',
              right: '10mm',
              textAlign: 'center'
            }}>
              {/* Grey border line */}
              <div style={{ 
                height: '1px',
                background: '#D9D9D9',
                marginBottom: '4mm'
              }}></div>
              
              {/* Meta text with guest count and date */}
              <div style={{ 
                fontSize: '10pt', 
                color: '#000000',
                marginBottom: '3mm'
              }}>
                Total Guests: {guests.length} – Generated on: {formatGeneratedDate()}
              </div>
              
              {/* Wedding Waitress Logo */}
              <img 
                src="/wedding-waitress-new-logo.png"
                alt="Wedding Waitress"
                style={{
                  width: '60mm',
                  height: 'auto',
                  display: 'block',
                  margin: '0 auto'
                }}
              />
            </div>
          </div>
        );
      })}
    </>
  );
};