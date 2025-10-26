/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Place Cards feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated 300 DPI export system.
 * 
 * Last completed: 2025-10-04
 * Updated: 2025-10-26 - Added Full Seating Chart-style layout with pagination controls
 */

import React, { forwardRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState(1);
  
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


  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const currentPageGuests = pages[currentPage - 1] || [];

  if (!guests.length) {
    return (
      <div className="py-8 text-center text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
        <p>No assigned guests found.</p>
        <p className="text-sm">Assign guests to tables to see place cards preview.</p>
      </div>
    );
  }

  const renderPlaceCard = (guest: Guest) => {
    const tableInfo = guest.table_no && guest.seat_no
      ? `Table ${guest.table_no}, Seat ${guest.seat_no}`
      : `Table —, Seat —`;

    const individualMessage = currentSettings.individual_messages?.[guest.id];
    const message = individualMessage || currentSettings.mass_message || '';

    return (
      <div
        key={guest.id}
        className="relative flex items-center justify-center"
        style={{
          width: '105mm',
          height: '99mm',
          backgroundColor: currentSettings.background_color,
          color: currentSettings.font_color,
        }}
      >
        {/* Background Image */}
        {currentSettings.background_image_url && currentSettings.background_image_type === 'full' && (
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              top: '55%',
              backgroundImage: `url(${currentSettings.background_image_url})`,
              backgroundPosition: `${currentSettings.background_image_x_position || 50}% ${currentSettings.background_image_y_position || 50}%`,
              backgroundSize: `${currentSettings.background_image_scale || 100}% auto`,
              backgroundRepeat: 'no-repeat',
              opacity: (currentSettings.background_image_opacity || 100) / 100,
            }}
          />
        )}

        {/* Decorative Image */}
        {currentSettings.background_image_url && currentSettings.background_image_type === 'decorative' && (
          <div
            className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-cover bg-center opacity-30"
            style={{
              backgroundImage: `url(${currentSettings.background_image_url})`,
            }}
          />
        )}

        {/* Card Content */}
        <div className="relative z-10 text-center p-4 w-full">
          <div
            style={{
              fontFamily: currentSettings.guest_font_family,
              fontWeight: currentSettings.guest_name_bold ? '700' : '400',
              fontStyle: currentSettings.guest_name_italic ? 'italic' : 'normal',
              textDecoration: currentSettings.guest_name_underline ? 'underline' : 'none',
              fontSize: `${currentSettings.guest_name_font_size}pt`,
              marginBottom: `${currentSettings.name_spacing}mm`,
            }}
          >
            {currentSettings.background_behind_names ? (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1mm 2mm',
                display: 'inline-block'
              }}>
                {guest.first_name} {guest.last_name}
              </div>
            ) : (
              <>{guest.first_name} {guest.last_name}</>
            )}
          </div>
          
          <div
            style={{
              fontFamily: currentSettings.info_font_family,
              fontSize: `${currentSettings.info_font_size}pt`,
            }}
          >
            {currentSettings.background_behind_table_seats ? (
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '0.75mm 1.5mm',
                display: 'inline-block'
              }}>
                {tableInfo}
              </div>
            ) : (
              <>{tableInfo}</>
            )}
          </div>

          {message && (
            <div
              className="mt-3"
              style={{
                fontFamily: currentSettings.info_font_family,
                fontSize: `${currentSettings.info_font_size}pt`,
                fontStyle: 'italic',
              }}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
          {/* Screen Preview Only */}
          <div className="print:hidden">
            {/* TOP Pagination Controls */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* A4 Paper Container */}
            <div className="flex justify-center">
              <div 
                style={{ 
                  width: '210mm', 
                  height: '297mm',
                  padding: '12.7mm'
                }} 
                className="bg-white shadow-lg overflow-hidden"
              >
                {/* Place Cards Content */}
                <div ref={ref}>
                  <div className="relative" style={{ minHeight: '240mm' }}>
                    {/* Guide lines for card positioning */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-0 bottom-0 border-l border-dashed border-gray-300" style={{ left: '50%' }} />
                      <div className="absolute left-0 right-0 border-t border-dashed border-gray-300" style={{ top: '33.33%' }} />
                      <div className="absolute left-0 right-0 border-t border-dashed border-gray-300" style={{ top: '66.66%' }} />
                    </div>

                    {/* 2x3 grid for 6 cards */}
                    <div className="grid grid-cols-2 grid-rows-3 h-full">
                      {currentPageGuests.map((guest) => renderPlaceCard(guest))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM Pagination Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Print Version - All Pages */}
          <div className="hidden print:block">
            {pages.map((pageGuests, pageIndex) => (
              <div
                key={pageIndex}
                style={{
                  width: '210mm',
                  height: '297mm',
                  pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto',
                  padding: '12.7mm',
                  backgroundColor: '#FFFFFF'
                }}
              >
                {/* Print Content */}
                <div className="relative" style={{ minHeight: '240mm' }}>
                  {/* Cut lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 bottom-0 border-l border-dashed border-gray-300" style={{ left: '50%' }} />
                    <div className="absolute left-0 right-0 border-t border-dashed border-gray-300" style={{ top: '33.33%' }} />
                    <div className="absolute left-0 right-0 border-t border-dashed border-gray-300" style={{ top: '66.66%' }} />
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-2 grid-rows-3 h-full">
                    {pageGuests.map((guest) => renderPlaceCard(guest))}
                  </div>
                </div>
              </div>
            ))}
          </div>
    </div>
  );
});

PlaceCardPreview.displayName = 'PlaceCardPreview';

export default PlaceCardPreview;
