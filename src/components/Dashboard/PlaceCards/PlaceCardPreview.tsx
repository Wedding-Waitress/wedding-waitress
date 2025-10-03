import React, { forwardRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { Eye } from 'lucide-react';

interface PlaceCardPreviewProps {
  settings: PlaceCardSettings | null;
  guests: Guest[];
  event: any;
  isExporting?: boolean;
  focusedPage?: number | null;
}

export const PlaceCardPreview = forwardRef<HTMLDivElement, PlaceCardPreviewProps>(({
  settings,
  guests,
  event,
  isExporting = false,
  focusedPage = null
}, ref) => {
  const currentSettings = settings || {
    event_id: '',
    user_id: '',
    font_family: 'Inter',
    font_color: '#000000',
    background_color: '#ffffff',
    background_image_url: null,
    background_image_type: 'none' as const,
    mass_message: '',
    individual_messages: {},
    guest_font_family: 'Inter',
    info_font_family: 'Inter',
    guest_name_bold: false,
    guest_name_italic: false,
    guest_name_underline: false,
    guest_name_font_size: 24,
    info_font_size: 12,
    name_spacing: 4
  };

  // Sort guests by table number then seat number
  const sortedGuests = [...guests].sort((a, b) => {
    const tableA = a.table_no || 0;
    const tableB = b.table_no || 0;
    if (tableA !== tableB) return tableA - tableB;
    const seatA = a.seat_no || 0;
    const seatB = b.seat_no || 0;
    return seatA - seatB;
  });

  // Group cards into pages (6 cards per A4 page: 2 columns × 3 rows)
  const cardsPerPage = 6;
  const totalPages = Math.ceil(sortedGuests.length / cardsPerPage);
  const pages: Guest[][] = [];
  for (let i = 0; i < sortedGuests.length; i += cardsPerPage) {
    pages.push(sortedGuests.slice(i, i + cardsPerPage));
  }

  // Text size is now fixed and uniform for all names

  if (!guests.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview - A4 Layout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No assigned guests found.</p>
            <p className="text-sm">Assign guests to tables to see place cards preview.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card ref={ref}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview - A4 Layout
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            A4 Format • 6 Cards per Page • Page 1 of {totalPages}
          </p>
        </CardHeader>
        <CardContent className="bg-[#F6F0FF] p-6">
          <div className="space-y-8">
            {pages.map((pageGuests, pageIndex) => (
              <div key={pageIndex} className="space-y-2">
                {pageIndex > 0 && (
                  <div className="text-xs text-center text-muted-foreground pt-4">
                    Page {pageIndex + 1} of {totalPages} • A4 Format • 6 Cards per Page
                  </div>
                )}
                
                {/* A4 Preview Container - Actual Size */}
                <div 
                  className={`place-card-preview-container mx-auto bg-white shadow-lg overflow-visible ${isExporting ? 'exporting' : ''} ${focusedPage === pageIndex ? 'ring-4 ring-primary' : ''}`}
                  data-page={pageIndex}
                  style={{
                    width: '210mm',
                    height: '297mm',
                    borderRadius: 0,
                  }}
                >
                  <div 
                    className="place-card-a4-page"
                    style={{
                      width: '100%',
                      height: '100%',
                      transform: 'scale(1)',
                      transformOrigin: 'top left',
                      position: 'relative',
                    }}
                  >
                    {/* Cut lines - vertical center + two horizontals at row breaks */}
                    <div 
                      className="cutline-v"
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: '50%',
                        width: '1px',
                        borderLeft: '1px solid rgba(150, 150, 150, 0.5)',
                        zIndex: 10,
                        transform: 'translateX(-0.5px)',
                      }}
                    />
                    <div 
                      className="cutline-h1"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '33.333%',
                        height: 0,
                        borderTop: '0.5px solid rgba(217, 217, 217, 0.6)',
                        zIndex: 1,
                      }}
                    />
                    <div 
                      className="cutline-h2"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '66.666%',
                        height: 0,
                        borderTop: '0.5px solid rgba(217, 217, 217, 0.6)',
                        zIndex: 1,
                      }}
                    />
                    {/* 2 columns × 3 rows grid - cards render directly in place-card-a4-page */}
                    {Array.from({ length: 6 }).map((_, cardIndex) => {
                        const guest = pageGuests[cardIndex];
                        if (!guest) {
                          return (
                            <div 
                              key={`empty-${cardIndex}`}
                              className="place-card-cell border-box"
                            />
                          );
                        }

                        const tableInfo = guest.table_no && guest.seat_no
                          ? `Table ${guest.table_no}, Seat ${guest.seat_no}`
                          : `Table —, Seat —`;

                        const individualMessage = currentSettings.individual_messages?.[guest.id];
                        const message = individualMessage || currentSettings.mass_message || '';

                        return (
                          <div 
                            key={guest.id}
                            className="place-card-cell"
                            style={{
                              backgroundColor: currentSettings.background_color,
                              color: currentSettings.font_color,
                            }}
                          >

                            {/* Background Image */}
                            {currentSettings.background_image_url && currentSettings.background_image_type === 'full' && (
                              <div
                                className="place-card-background absolute inset-x-0 top-1/2 bottom-0 pointer-events-none"
                                style={{
                                  backgroundImage: `url(${currentSettings.background_image_url})`,
                                  backgroundPosition: `${currentSettings.background_image_x_position || 50}% ${currentSettings.background_image_y_position || 50}%`,
                                  backgroundSize: `${currentSettings.background_image_scale || 100}%`,
                                  backgroundRepeat: 'no-repeat',
                                  opacity: (currentSettings.background_image_opacity || 100) / 100,
                                  '--bg-opacity': `${(currentSettings.background_image_opacity || 100) / 100}`,
                                } as React.CSSProperties & { '--bg-opacity': string }}
                              />
                            )}

                            {/* Card Content - positioned in lower half */}
                            <div className={`card-content ${currentSettings.background_image_url && currentSettings.background_image_type === 'decorative' ? 'has-decorative-image' : ''} ${currentSettings.background_image_url && currentSettings.background_image_type === 'full' ? 'has-full-background' : ''}`}>
                              {/* Large Decorative Image on Right Side */}
                              {currentSettings.background_image_url && currentSettings.background_image_type === 'decorative' && (
                                <div className="decorative-image-container">
                                  <img
                                    src={currentSettings.background_image_url}
                                    alt=""
                                    className="decorative-image"
                                  />
                                </div>
                              )}

                              {/* Text Container - wraps both name and info */}
                              <div>
                                {/* Guest Name */}
                                <div 
                                  className="guest-name"
                                   style={{
                                    fontFamily: currentSettings.guest_font_family,
                                    fontWeight: currentSettings.guest_name_bold ? '700' : '400',
                                    fontStyle: currentSettings.guest_name_italic ? 'italic' : 'normal',
                                    textDecoration: currentSettings.guest_name_underline ? 'underline' : 'none',
                                    fontSize: `${currentSettings.guest_name_font_size}pt`,
                                    marginBottom: `${currentSettings.name_spacing}mm`
                                  }}
                                >
                                  {guest.first_name} {guest.last_name}
                                </div>

                                {/* Table & Seat Info */}
                                <div 
                                  className="table-info"
                                  style={{
                                    fontFamily: currentSettings.info_font_family,
                                    fontSize: `${currentSettings.info_font_size}pt`
                                  }}
                                >
                                  {tableInfo}
                                </div>
                              </div>
                            </div>

                            {/* Card Back - for messages (inside fold) */}
                            {message && (
                              <div className="card-back">
                                <div 
                                  className="message-text"
                                  style={{
                                    fontFamily: currentSettings.info_font_family
                                  }}
                                >
                                  {message}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Print-only version with exact mm measurements */}
      <style>{`
        /* Screen preview styles */
        .place-card-preview-container {
          position: relative;
          transition: all 0.3s ease;
          background-color: #FFFFFF;
          border-radius: 0 !important;
        }

        .place-card-a4-page {
          display: grid;
          grid-template-columns: repeat(2, 105mm);
          grid-template-rows: repeat(3, 99mm);
          width: 210mm;
          height: 297mm;
          gap: 0;
          background: #FFFFFF;
        }

          .place-card-cell {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            text-align: center;
            padding: 8mm;
            overflow: visible;
            width: 105mm;
            height: 99mm;
          }

        /* Card content positioned in lower half (below fold) */
        .card-content {
          position: absolute;
          left: 8mm;
          right: 8mm;
          top: 70%;
          transform: translateY(-50%);
          text-align: center;
        }

        /* Move text down when full background image is present */
        .card-content.has-full-background {
          top: 82%;
        }

        /* Split layout when decorative image exists */
        .card-content.has-decorative-image {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4mm;
          left: 6mm;
          right: 6mm;
        }

        .card-content.has-decorative-image .guest-name,
        .card-content.has-decorative-image .table-info {
          text-align: left;
        }

        /* Text container takes left side when decorative image exists */
        .card-content.has-decorative-image > div:first-child {
          flex: 0 0 55%;
          text-align: left;
        }

        /* Large decorative image on right side */
        .decorative-image-container {
          flex: 0 0 40%;
          display: flex;
          align-items: center;
          justify-content: center;
          max-height: 35mm;
        }

        .decorative-image {
          width: 100%;
          height: 100%;
          max-height: 35mm;
          object-fit: contain;
          border: none;
          border-radius: 4px;
        }

        .guest-name {
          line-height: 1.1;
          text-align: center;
          overflow: visible;
          font-weight: 400;
          font-synthesis: weight;
        }

        .table-info {
          font-weight: 400;
          margin-top: 2mm;
        }

        .card-back {
          position: relative;
          width: 100%;
          height: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }

        .message-text {
          font-size: 10pt;
          opacity: 0.7;
          line-height: 1.3;
          max-width: 90%;
        }

        /* Print styles - exact A4 measurements */
        @media print {
          body * {
            visibility: hidden;
          }

          .place-card-preview-container,
          .place-card-preview-container * {
            visibility: visible;
          }

          .place-card-preview-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border-radius: 0;
            overflow: visible;
            page-break-after: always;
            background-color: #FFFFFF;
          }

          .place-card-a4-page {
            display: grid;
            grid-template-columns: repeat(2, 105mm);
            grid-template-rows: repeat(3, 99mm);
            width: 210mm;
            height: 297mm;
            gap: 0;
            background: #FFFFFF;
          }

          /* Print cut lines at exact positions */
          .cutline-v {
            left: 105mm !important;
            width: 1px !important;
            border-left: 1px solid rgba(150, 150, 150, 0.5) !important;
            transform: translateX(-0.5px) !important;
          }

          .cutline-h1 {
            top: 99mm !important;
            border-top: 0.5px solid rgba(217, 217, 217, 0.6) !important;
          }

          .cutline-h2 {
            top: 198mm !important;
            border-top: 0.5px solid rgba(217, 217, 217, 0.6) !important;
          }

          .place-card-cell {
            width: 105mm;
            height: 99mm;
            padding: 8mm;
          }

          .table-info {
            font-weight: 700;
          }

          .message-text {
            font-size: 10pt;
          }
          
          .card-content {
            left: 8mm;
            right: 8mm;
            top: 70%;
            transform: translateY(-50%);
          }

          .card-content.has-full-background {
            top: 82%;
          }

          .card-content.has-decorative-image {
            left: 6mm;
            right: 6mm;
          }

          .decorative-image {
            border: none;
          }

          /* Preserve background image opacity in print */
          .place-card-background {
            opacity: var(--bg-opacity, 1) !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
});

PlaceCardPreview.displayName = 'PlaceCardPreview';