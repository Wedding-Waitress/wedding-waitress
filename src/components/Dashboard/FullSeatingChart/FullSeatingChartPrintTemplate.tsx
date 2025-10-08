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

  // Split guests into pages of 22 (11 per column)
  const guestsPerPage = 22;
  const totalPages = Math.ceil(guests.length / guestsPerPage);
  const pages = [];
  
  for (let i = 0; i < totalPages; i++) {
    const startIdx = i * guestsPerPage;
    const endIdx = Math.min(startIdx + guestsPerPage, guests.length);
    const pageGuests = guests.slice(startIdx, endIdx);
    
    pages.push({
      pageNumber: i + 1,
      leftColumn: pageGuests.slice(0, 11),
      rightColumn: pageGuests.slice(11, 22)
    });
  }

  const renderGuestEntry = (guest: Guest) => (
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
          marginBottom: '1.5mm',
          lineHeight: '1.2',
        }}>
          {formatGuestName(guest)}
        </div>
        
        {/* Relationship Badge */}
        {settings.showRelation && guest.relation_display && (
          <div style={{ marginBottom: '1.5mm' }}>
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

        {/* Dietary Information */}
        {settings.showDietary && guest.dietary && (
          <div style={{ marginBottom: '1.5mm' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '9px',
              color: '#ef4444',
              fontWeight: '500',
            }}>
              Dietary: {guest.dietary}
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
  );

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
            break-after: page;
          }
        }
      `}</style>
      
      {pages.map((page, pageIdx) => (
        <div 
          key={pageIdx}
          id={`full-seating-print-content-page-${page.pageNumber}`}
          className={`hidden print:block ${pageIdx < pages.length - 1 ? 'page-break' : ''}`}
          style={{
            position: 'relative',
            width: '210mm',
            height: '297mm',
            padding: '20mm 15mm',
            boxSizing: 'border-box',
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
              {event.venue || 'Venue TBD'} – Total Guests: {guests.length} – Page {page.pageNumber} of{' '}
              {totalPages} – Generated on: {formatGeneratedDate()}
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
              GUESTS {(page.pageNumber - 1) * 22 + 1}-{Math.min((page.pageNumber - 1) * 22 + 11, guests.length)}
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#333',
                textAlign: 'center',
              }}
            >
              GUESTS {(page.pageNumber - 1) * 22 + 12}-{Math.min(page.pageNumber * 22, guests.length)}
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
              {page.leftColumn.map(renderGuestEntry)}
            </div>

            {/* Right Column */}
            <div>
              {page.rightColumn.map(renderGuestEntry)}
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
      ))}
    </>
  );
};