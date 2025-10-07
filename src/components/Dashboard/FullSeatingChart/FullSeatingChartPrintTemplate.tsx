import React from 'react';
import { Guest } from '@/hooks/useGuests';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { normalizeRsvp } from '@/lib/rsvp';
import weddingWaitressLogo from '@/assets/wedding-waitress-new-logo.png';

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

  // Split guests into two columns
  const midPoint = Math.ceil(guests.length / 2);
  const leftColumn = guests.slice(0, midPoint);
  const rightColumn = guests.slice(midPoint);

  // Font size mapping to match PDF output
  const fontSizeMap = {
    small: { name: '10.5pt', details: '9.5pt', lineHeight: 1.2 },
    medium: { name: '12pt', details: '11pt', lineHeight: 1.2 },
    large: { name: '13.5pt', details: '12.5pt', lineHeight: 1.2 }
  };
  const currentFontSize = fontSizeMap[settings.fontSize];

  return (
    <div 
      id="full-seating-print-content"
      className="hidden print:block"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '210mm',
        height: '297mm',
        padding: '10mm',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: '#ffffff',
        fontFamily: 'Arial, Helvetica, sans-serif'
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
            GUESTS 1-{leftColumn.length}
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
            GUESTS {leftColumn.length + 1}-{guests.length}
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
        maxHeight: '222mm',
        overflow: 'hidden'
      }}>
        {/* Left Column */}
        <div style={{ flex: 1 }}>
          {leftColumn.map((guest) => {
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
          })}
        </div>

        {/* Right Column */}
        <div style={{ flex: 1 }}>
          {rightColumn.map((guest) => {
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
          })}
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
        <div style={{ 
          borderTop: '0.3mm solid #ddd',
          paddingTop: '5mm',
          marginBottom: '3mm'
        }}>
          <p style={{ 
            fontSize: '8pt', 
            color: '#666666',
            margin: '0 0 3mm 0'
          }}>
            Total Guests: {guests.length} - Generated on: {new Date().toLocaleDateString()}
          </p>
          <img 
            src={weddingWaitressLogo} 
            alt="Wedding Waitress" 
            style={{ 
              height: '12mm',
              opacity: 0.6
            }}
          />
        </div>
      </div>
    </div>
  );
};