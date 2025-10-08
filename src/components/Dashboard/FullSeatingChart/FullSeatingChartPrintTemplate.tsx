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
    const day = now.getDate();
    const ordinal = getOrdinalSuffix(day);
    const month = now.toLocaleDateString('en-US', { month: 'long' });
    const year = now.getFullYear();
    return `${month} ${day}${ordinal}, ${year}`;
  };

  // Split guests into exactly 11 per column
  const leftColumn = guests.slice(0, 11);
  const rightColumn = guests.slice(11, 22);

  return (
    <>
      <style>{`
        @page {
          margin: 0;
        }
        @media print {
          body {
            margin: 0;
          }
        }
      `}</style>
      <div 
        id="full-seating-print-content"
        className="hidden print:block"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '210mm',
          height: '297mm',
          padding: '20mm 15mm',
          boxSizing: 'border-box',
          overflow: 'hidden',
          background: '#ffffff',
          fontFamily: 'Arial, Helvetica, sans-serif'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '12mm' }}>
          {/* Logo */}
          <div style={{ marginBottom: '8mm' }}>
            <img
              src="/wedding-waitress-print-logo.png"
              alt="Wedding Waitress"
              style={{
                width: '160px',
                height: 'auto',
                margin: '0 auto',
                display: 'block',
              }}
            />
          </div>

          {/* Event Name */}
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#8B5CF6',
              margin: '0 0 6mm 0',
              lineHeight: '1.2',
            }}
          >
            {event.name}
          </h1>

          {/* Subtitle - Full Seating Chart */}
          <div
            style={{
              fontSize: '20px',
              color: '#8B5CF6',
              fontWeight: '600',
              marginBottom: '6mm',
            }}
          >
            Full Seating Chart – {event.date && formatDateWithOrdinal(event.date)}
          </div>

          {/* Meta Information Line */}
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              marginBottom: '4mm',
            }}
          >
            {event.venue || 'Venue TBD'} – Total Guests: {guests.length} – Page 1 of{' '}
            {Math.ceil(guests.length / 22)} – Generated on: {formatGeneratedDate()}
          </div>

          {/* Separator Line */}
          <div
            style={{
              borderBottom: '1px solid #000',
              margin: '0',
            }}
          />
        </div>

        {/* Column Headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10mm',
            marginBottom: '5mm',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#333',
              textAlign: 'center',
            }}
          >
            GUESTS 1-11
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#333',
              textAlign: 'center',
            }}
          >
            GUESTS 12-22
          </div>
        </div>

        {/* Guest Lists in Two Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10mm',
          }}
        >
          {/* Left Column */}
          <div>
            {leftColumn.map((guest) => (
              <div
                key={guest.id}
                style={{
                  marginBottom: '4mm',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '3mm',
                }}
              >
                {/* Radio Circle */}
                <div
                  style={{
                    width: '5mm',
                    height: '5mm',
                    border: '1.5px solid #999',
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: '1mm',
                  }}
                />
                
                {/* Guest Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Guest Name */}
                  <div style={{ 
                    fontWeight: '700', 
                    color: '#000', 
                    fontSize: '14px',
                    marginBottom: '2mm',
                    lineHeight: '1.2',
                  }}>
                    {formatGuestName(guest)}
                  </div>
                  
                  {/* Relationship Badge */}
                  {settings.showRelation && guest.relation_display && (
                    <div style={{ marginBottom: '2mm' }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        color: '#666',
                        backgroundColor: '#f3f4f6',
                        padding: '1.5mm 3mm',
                        borderRadius: '3mm',
                      }}>
                        {guest.relation_display}
                      </span>
                    </div>
                  )}
                </div>

                {/* Table Badge */}
                <div style={{
                  flexShrink: 0,
                  marginTop: '1mm',
                }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    color: '#666',
                    backgroundColor: '#e5e7eb',
                    padding: '2mm 4mm',
                    borderRadius: '4mm',
                    fontWeight: '500',
                  }}>
                    Table {guest.table_no || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div>
            {rightColumn.map((guest) => (
              <div
                key={guest.id}
                style={{
                  marginBottom: '4mm',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '3mm',
                }}
              >
                {/* Radio Circle */}
                <div
                  style={{
                    width: '5mm',
                    height: '5mm',
                    border: '1.5px solid #999',
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: '1mm',
                  }}
                />
                
                {/* Guest Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Guest Name */}
                  <div style={{ 
                    fontWeight: '700', 
                    color: '#000', 
                    fontSize: '14px',
                    marginBottom: '2mm',
                    lineHeight: '1.2',
                  }}>
                    {formatGuestName(guest)}
                  </div>
                  
                  {/* Relationship Badge */}
                  {settings.showRelation && guest.relation_display && (
                    <div style={{ marginBottom: '2mm' }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        color: '#666',
                        backgroundColor: '#f3f4f6',
                        padding: '1.5mm 3mm',
                        borderRadius: '3mm',
                      }}>
                        {guest.relation_display}
                      </span>
                    </div>
                  )}
                </div>

                {/* Table Badge */}
                <div style={{
                  flexShrink: 0,
                  marginTop: '1mm',
                }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    color: '#666',
                    backgroundColor: '#e5e7eb',
                    padding: '2mm 4mm',
                    borderRadius: '4mm',
                    fontWeight: '500',
                  }}>
                    Table {guest.table_no || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '15mm',
            left: '15mm',
            right: '15mm',
            textAlign: 'center',
            fontSize: '10px',
            color: '#999',
          }}
        >
          <img
            src="/wedding-waitress-print-logo.png"
            alt="Wedding Waitress"
            style={{
              width: '100px',
              height: 'auto',
              margin: '0 auto',
              display: 'block',
              opacity: 0.5,
            }}
          />
        </div>
      </div>
    </>
  );
};