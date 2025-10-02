import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { Eye } from 'lucide-react';

interface PlaceCardPreviewProps {
  settings: PlaceCardSettings | null;
  guests: Guest[];
  event: any;
}

export const PlaceCardPreview: React.FC<PlaceCardPreviewProps> = ({
  settings,
  guests,
  event
}) => {
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview - A4 Layout
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            A4 Format • 6 Cards per Page • Page 1 of {totalPages}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {pages.map((pageGuests, pageIndex) => (
              <div key={pageIndex} className="space-y-2">
                {pageIndex > 0 && (
                  <div className="text-xs text-center text-muted-foreground pt-4">
                    Page {pageIndex + 1} of {totalPages} • A4 Format • 6 Cards per Page
                  </div>
                )}
                
                {/* A4 Preview Container */}
                <div 
                  className="place-card-preview-container mx-auto bg-white rounded-lg shadow-lg overflow-hidden"
                  style={{
                    width: 'min(100%, 420px)',
                    aspectRatio: '210 / 297',
                  }}
                >
                  <div 
                    className="place-card-a4-page"
                    style={{
                      width: '100%',
                      height: '100%',
                      transform: 'scale(1)',
                      transformOrigin: 'top left',
                    }}
                  >
                    {/* 2 columns × 3 rows grid */}
                    <div className="grid grid-cols-2 w-full h-full">
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
                              fontFamily: currentSettings.font_family,
                              color: currentSettings.font_color,
                            }}
                          >
                            {/* Cutting markers - one at each corner */}
                            <svg className="cutting-markers" xmlns="http://www.w3.org/2000/svg">
                              {/* Top-left */}
                              <line x1="0" y1="0" x2="4mm" y2="0" stroke="#D0D0D0" strokeWidth="0.5" />
                              <line x1="0" y1="0" x2="0" y2="4mm" stroke="#D0D0D0" strokeWidth="0.5" />
                              {/* Top-right */}
                              <line x1="calc(100% - 4mm)" y1="0" x2="100%" y2="0" stroke="#D0D0D0" strokeWidth="0.5" />
                              <line x1="100%" y1="0" x2="100%" y2="4mm" stroke="#D0D0D0" strokeWidth="0.5" />
                              {/* Bottom-left */}
                              <line x1="0" y1="calc(100% - 4mm)" x2="0" y2="100%" stroke="#D0D0D0" strokeWidth="0.5" />
                              <line x1="0" y1="100%" x2="4mm" y2="100%" stroke="#D0D0D0" strokeWidth="0.5" />
                              {/* Bottom-right */}
                              <line x1="100%" y1="calc(100% - 4mm)" x2="100%" y2="100%" stroke="#D0D0D0" strokeWidth="0.5" />
                              <line x1="calc(100% - 4mm)" y1="100%" x2="100%" y2="100%" stroke="#D0D0D0" strokeWidth="0.5" />
                            </svg>

                            {/* Background Image */}
                            {currentSettings.background_image_url && currentSettings.background_image_type === 'full' && (
                              <div
                                className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none"
                                style={{
                                  backgroundImage: `url(${currentSettings.background_image_url})`,
                                }}
                              />
                            )}

                            {/* Card Content - Front face (visible when folded) */}
                            <div className="card-front">
                              {/* Decorative Image */}
                              {currentSettings.background_image_url && currentSettings.background_image_type === 'decorative' && (
                                <div className="absolute top-2 right-2 w-6 h-6 opacity-60">
                                  <img
                                    src={currentSettings.background_image_url}
                                    alt=""
                                    className="w-full h-full object-cover rounded"
                                  />
                                </div>
                              )}

                              {/* Guest Name */}
                              <div className="guest-name">
                                {guest.first_name} {guest.last_name}
                              </div>

                              {/* Table & Seat Info */}
                              <div className="table-info">
                                {tableInfo}
                              </div>
                            </div>

                            {/* Card Back - for messages (inside fold) */}
                            {message && (
                              <div className="card-back">
                                <div className="message-text">
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
        }

        .place-card-a4-page {
          display: grid;
          background: white;
        }

        .place-card-cell {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 8px;
          overflow: hidden;
        }

        .cutting-markers {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }

        .card-front {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 50%;
        }

        .guest-name {
          font-size: clamp(14px, 2.5vw, 22px);
          font-weight: 600;
          line-height: 1.2;
          margin-bottom: 4px;
          word-wrap: break-word;
          max-width: 90%;
        }

        .table-info {
          font-size: clamp(9px, 1.5vw, 12px);
          opacity: 0.75;
          font-weight: 400;
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
          font-size: clamp(7px, 1.2vw, 10px);
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
          }

          .place-card-a4-page {
            width: 210mm;
            height: 297mm;
          }

          .place-card-cell {
            width: 105mm;
            height: 99mm;
            padding: 8mm;
          }

          .guest-name {
            font-size: 20pt;
          }

          .table-info {
            font-size: 11pt;
          }

          .message-text {
            font-size: 9pt;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
};