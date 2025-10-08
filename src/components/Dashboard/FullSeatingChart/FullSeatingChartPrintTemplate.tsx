import React from 'react';
import { Guest } from '@/hooks/useGuests';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { normalizeRsvp } from '@/lib/rsvp';

interface FullSeatingChartPrintTemplateProps {
  event: any;
  guests: Guest[];
  settings: FullSeatingChartSettings;
}

// Font size configurations with line heights in pt
const fontConfigs = {
  small: {
    nameSize: '10.5pt',
    detailSize: '9.5pt',
    lineHeightPt: 16,
  },
  medium: {
    nameSize: '12pt',
    detailSize: '11pt',
    lineHeightPt: 18,
  },
  large: {
    nameSize: '13.5pt',
    detailSize: '12.5pt',
    lineHeightPt: 21,
  }
};

// Helper to format guest name
const formatGuestName = (guest: Guest, sortBy: string) => {
  if (sortBy === 'lastName') {
    return `${guest.last_name || ''}, ${guest.first_name}`.trim();
  }
  return `${guest.first_name} ${guest.last_name || ''}`.trim();
};

// Helper to format date as DD/MM/YYYY
const formatGeneratedDate = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper to format event date with ordinal
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

// Helper to chunk array into pages
const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const FullSeatingChartPrintTemplate: React.FC<FullSeatingChartPrintTemplateProps> = ({
  event,
  guests,
  settings
}) => {
  const fontConfig = fontConfigs[settings.fontSize];
  
  // Calculate pagination
  const availableHeightMM = 250; // A4 height minus margins and header/footer space
  const lineHeightMM = (fontConfig.lineHeightPt / 72) * 25.4; // Convert pt to mm
  const rowsPerColumn = Math.floor(availableHeightMM / lineHeightMM);
  const rowsPerPage = rowsPerColumn * 2; // Two columns
  
  // Split guests into pages
  const pages = chunkArray(guests, rowsPerPage);
  const totalGuests = guests.length;
  const generatedDate = formatGeneratedDate();

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 12mm;
        }
        
        @media print {
          html, body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          
          /* Hide all non-print UI */
          .print\\:hidden,
          [class*="no-print"],
          .ww-box,
          header:not(.ww-header),
          nav,
          button,
          .badge,
          [role="combobox"],
          .lucide,
          .dropdown-menu,
          .toolbar,
          [data-radix-popper-content-wrapper],
          .toast,
          .chip,
          svg {
            display: none !important;
          }
          
          #ww-print-root {
            display: block !important;
            width: 100%;
          }
          
          .ww-page {
            position: relative;
            page-break-after: always;
            min-height: 277mm;
            background: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
          }
          
          .ww-page:last-child {
            page-break-after: auto;
          }
          
          .ww-header {
            text-align: center;
            margin-bottom: 8mm;
          }
          
          .ww-content {
            margin-bottom: 28mm;
            display: flex;
            gap: 10mm;
          }
          
          .ww-column {
            flex: 1;
          }
          
          .ww-column-header {
            font-weight: bold;
            font-size: 9pt;
            margin-bottom: 2mm;
            padding-bottom: 1mm;
            border-bottom: 0.3mm solid #000;
          }
          
          .ww-row {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 1.5mm;
          }
          
          .ww-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10pt;
            padding-top: 6mm;
          }
          
          .ww-footer .line {
            height: 1px;
            background: #D9D9D9;
            margin: 0 auto 3mm auto;
            width: 100%;
          }
          
          .ww-footer .meta {
            margin-bottom: 3mm;
            color: #000;
            font-weight: normal;
            font-size: 9pt;
          }
          
          .ww-footer .logo {
            width: 120mm;
            height: auto;
            display: block;
            margin: 0 auto;
          }
        }
      `}</style>
      
      <div 
        id="ww-print-root"
        className="hidden print:block"
      >
        {pages.map((pageGuests, pageIndex) => {
          const startIndex = pageIndex * rowsPerPage;
          const midPoint = Math.ceil(pageGuests.length / 2);
          const leftColumn = pageGuests.slice(0, midPoint);
          const rightColumn = pageGuests.slice(midPoint);
          
          return (
            <section key={pageIndex} className="ww-page">
              {/* Header */}
              <header className="ww-header">
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
              </header>
              
              {/* Content - Two Columns */}
              <div className="ww-content">
                {/* Left Column */}
                <div className="ww-column">
                  <div className="ww-column-header">
                    GUESTS {startIndex + 1}-{startIndex + leftColumn.length}
                  </div>
                  {leftColumn.map((guest) => {
                    const guestName = formatGuestName(guest, settings.sortBy);
                    const tableInfo = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
                    
                    return (
                      <div key={guest.id} className="ww-row">
                        {/* Name line with checkbox and table */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          fontSize: fontConfig.nameSize,
                          lineHeight: `${fontConfig.lineHeightPt}pt`
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
                              fontSize: fontConfig.detailSize,
                              color: '#2563eb',
                              lineHeight: 1.2
                            }}>
                              Dietary: {guest.dietary}
                            </div>
                          )}
                          {settings.showRsvp && guest.rsvp && (
                            <div style={{ 
                              fontSize: fontConfig.detailSize,
                              color: normalizeRsvp(guest.rsvp) === 'Attending' ? '#22c55e' :
                                     normalizeRsvp(guest.rsvp) === 'Not Attending' ? '#ef4444' : '#f59e0b',
                              lineHeight: 1.2
                            }}>
                              RSVP: {normalizeRsvp(guest.rsvp)}
                            </div>
                          )}
                          {settings.showRelation && guest.relation_display && (
                            <div style={{ 
                              fontSize: fontConfig.detailSize,
                              color: '#8B5CF6',
                              lineHeight: 1.2
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
                <div className="ww-column">
                  <div className="ww-column-header">
                    GUESTS {startIndex + leftColumn.length + 1}-{startIndex + pageGuests.length}
                  </div>
                  {rightColumn.map((guest) => {
                    const guestName = formatGuestName(guest, settings.sortBy);
                    const tableInfo = guest.table_no ? `Table ${guest.table_no}` : 'Unassigned';
                    
                    return (
                      <div key={guest.id} className="ww-row">
                        {/* Name line with checkbox and table */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          fontSize: fontConfig.nameSize,
                          lineHeight: `${fontConfig.lineHeightPt}pt`
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
                              fontSize: fontConfig.detailSize,
                              color: '#2563eb',
                              lineHeight: 1.2
                            }}>
                              Dietary: {guest.dietary}
                            </div>
                          )}
                          {settings.showRsvp && guest.rsvp && (
                            <div style={{ 
                              fontSize: fontConfig.detailSize,
                              color: normalizeRsvp(guest.rsvp) === 'Attending' ? '#22c55e' :
                                     normalizeRsvp(guest.rsvp) === 'Not Attending' ? '#ef4444' : '#f59e0b',
                              lineHeight: 1.2
                            }}>
                              RSVP: {normalizeRsvp(guest.rsvp)}
                            </div>
                          )}
                          {settings.showRelation && guest.relation_display && (
                            <div style={{ 
                              fontSize: fontConfig.detailSize,
                              color: '#8B5CF6',
                              lineHeight: 1.2
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
              
              {/* Footer - Fixed on every page */}
              <div className="ww-footer">
                <div className="line"></div>
                <div className="meta">
                  Total Guests: {totalGuests} – Generated on: {generatedDate}
                </div>
                <img 
                  className="logo" 
                  src="/wedding-waitress-new-logo.png" 
                  alt="Wedding Waitress"
                />
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
};
