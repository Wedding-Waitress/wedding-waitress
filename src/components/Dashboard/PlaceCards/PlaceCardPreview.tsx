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
        className="relative"
        style={{
          width: '105mm',
          height: '99mm',
          backgroundColor: currentSettings.background_color,
          color: currentSettings.font_color,
        }}
      >
        {/* Full Background Image (if applicable) */}
        {currentSettings.background_image_url && currentSettings.background_image_type === 'full' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${currentSettings.background_image_url})`,
              backgroundPosition: `${currentSettings.background_image_x_position || 50}% ${currentSettings.background_image_y_position || 50}%`,
              backgroundSize: 'cover',
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

        {/* BACK Half (Top) - MESSAGE ONLY */}
        <div 
          className="relative z-10 flex items-center justify-start"
          style={{ 
            height: '49.5mm',
            padding: '5mm',
            paddingTop: '6mm',
            transform: 'rotate(180deg)'
          }}
        >
          {message && (
            <div
              className="text-center"
              style={{
                fontFamily: currentSettings.info_font_family,
                fontSize: `${currentSettings.info_font_size}pt`,
                fontStyle: 'italic',
                color: currentSettings.font_color,
              }}
            >
              {message}
            </div>
          )}
        </div>

        {/* CREASE LINE at Y = 49.5mm */}
        <div 
          className="absolute left-0 right-0" 
          style={{ 
            top: '49.5mm',
            borderTop: '0.5px solid #d3d3d3',
            opacity: 0.3,
            zIndex: 100
          }}
        />

        {/* FRONT Half (Bottom) - GUEST NAME + TABLE/SEAT */}
        <div 
          className="relative z-10 flex flex-col items-center justify-start"
          style={{ 
            height: '49.5mm',
            padding: '5mm',
            paddingTop: '8mm'
          }}
        >
          {/* Guest Name */}
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
          
          {/* Table/Seat Info */}
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
                  height: '297mm'
                }} 
                className="bg-white shadow-lg overflow-hidden"
              >
                {/* Place Cards Content */}
                <div ref={ref} data-page={currentPage - 1}>
                  <div className="relative" style={{ height: '297mm' }}>
                    {/* Guide lines for card positioning - precise mm measurements */}
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
                      {/* Vertical divider at 105mm (center) */}
                      <div 
                        className="absolute top-0 bottom-0" 
                        style={{ 
                          left: '105mm',
                          borderLeft: '1px dotted #d3d3d3',
                          opacity: 0.7
                        }}
                      />
                      {/* Horizontal divider 1 at 99mm */}
                      <div 
                        className="absolute left-0 right-0" 
                        style={{ 
                          top: '99mm',
                          borderTop: '1px dotted #d3d3d3',
                          opacity: 0.7
                        }}
                      />
                      {/* Horizontal divider 2 at 198mm */}
                      <div 
                        className="absolute left-0 right-0" 
                        style={{ 
                          top: '198mm',
                          borderTop: '1px dotted #d3d3d3',
                          opacity: 0.7
                        }}
                      />
                    </div>

                    {/* 2x3 grid for 6 cards */}
                    <div className="grid grid-cols-2 grid-rows-3" style={{ height: '297mm' }}>
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
                data-page={pageIndex}
                style={{
                  width: '210mm',
                  height: '297mm',
                  pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto',
                  backgroundColor: '#FFFFFF'
                }}
              >
                {/* Print Content */}
                <div className="relative" style={{ height: '297mm' }}>
                  {/* Cut lines - precise mm measurements */}
                  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
                    {/* Vertical divider at 105mm (center) */}
                    <div 
                      className="absolute top-0 bottom-0" 
                      style={{ 
                        left: '105mm',
                        borderLeft: '1px dotted #d3d3d3',
                        opacity: 0.7
                      }}
                    />
                    {/* Horizontal divider 1 at 99mm */}
                    <div 
                      className="absolute left-0 right-0" 
                      style={{ 
                        top: '99mm',
                        borderTop: '1px dotted #d3d3d3',
                        opacity: 0.7
                      }}
                    />
                    {/* Horizontal divider 2 at 198mm */}
                    <div 
                      className="absolute left-0 right-0" 
                      style={{ 
                        top: '198mm',
                        borderTop: '1px dotted #d3d3d3',
                        opacity: 0.7
                      }} 
                    />
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-2 grid-rows-3" style={{ height: '297mm' }}>
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
