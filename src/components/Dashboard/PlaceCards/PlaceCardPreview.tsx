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
 * Updated: 2026-03-18 - Added interactive visual editor (Edit Mode)
 */

import React, { forwardRef, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { InteractiveTextOverlay } from '@/components/ui/InteractiveTextOverlay';
import { useToast } from '@/hooks/use-toast';

interface PlaceCardPreviewProps {
  settings: PlaceCardSettings | null;
  guests: Guest[];
  event: any;
  isExporting?: boolean;
  focusedPage?: number | null;
  selectedTable?: { name: string; table_no?: number | null } | null;
  onSettingsChange?: (settings: Partial<PlaceCardSettings>) => void;
  editMode?: boolean;
  onEditModeChange?: (mode: boolean) => void;
}

const CARD_WIDTH_MM = 105;
const FRONT_HEIGHT_MM = 49.5;

export const PlaceCardPreview = forwardRef<HTMLDivElement, PlaceCardPreviewProps>(({
  settings,
  guests,
  event,
  isExporting = false,
  focusedPage = null,
  selectedTable = null,
  onSettingsChange,
  editMode: editModeProp = false,
  onEditModeChange,
}, ref) => {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const editMode = editModeProp;
  const [selectedElement, setSelectedElement] = useState<'guest_name' | 'table_seat' | null>(null);

  // Clear selection when edit mode is turned off
  React.useEffect(() => {
    if (!editMode) setSelectedElement(null);
  }, [editMode]);
  const frontHalfRef = useRef<HTMLDivElement>(null);
  
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
    guest_font_family: 'Great Vibes',
    info_font_family: 'Beauty Mountains',
    guest_name_bold: false,
    guest_name_italic: false,
    guest_name_underline: false,
    guest_name_font_size: 40,
    info_font_size: 16,
    name_spacing: 4,
    info_bold: false,
    info_italic: false,
    info_underline: false,
    info_font_color: '#000000',
    message_font_family: 'Beauty Mountains',
    message_font_size: 16,
    message_font_color: '#000000',
    message_bold: false,
    message_italic: false,
    message_underline: false,
    background_behind_names: false,
    background_behind_table_seats: false,
    guest_name_offset_x: 0,
    guest_name_offset_y: 0,
    table_offset_x: 0,
    table_offset_y: 0,
    seat_offset_x: 0,
    seat_offset_y: 0,
  };

  // ─── Interactive Editor Handlers ───
  const handleGuestNameMove = useCallback((dxPct: number, dyPct: number) => {
    const newX = (currentSettings.guest_name_offset_x ?? 0) + (dxPct * CARD_WIDTH_MM) / 100;
    const newY = (currentSettings.guest_name_offset_y ?? 0) + (dyPct * FRONT_HEIGHT_MM) / 100;
    onSettingsChange?.({
      guest_name_offset_x: Math.round(newX * 10) / 10,
      guest_name_offset_y: Math.round(newY * 10) / 10,
    });
  }, [currentSettings.guest_name_offset_x, currentSettings.guest_name_offset_y, onSettingsChange]);

  const handleGuestNameFontSize = useCallback((deltaPx: number) => {
    const newSize = Math.max(8, Math.min(120, currentSettings.guest_name_font_size + Math.round(deltaPx)));
    onSettingsChange?.({ guest_name_font_size: newSize });
  }, [currentSettings.guest_name_font_size, onSettingsChange]);

  const handleGuestNameRotate = useCallback((degrees: number) => {
    onSettingsChange?.({ guest_name_rotation: degrees } as any);
  }, [onSettingsChange]);

  const handleGuestNameReset = useCallback(() => {
    onSettingsChange?.({
      guest_name_offset_x: 0,
      guest_name_offset_y: 0,
      guest_name_font_size: 40,
      guest_name_rotation: 0,
    } as any);
  }, [onSettingsChange]);

  const handleTableSeatMove = useCallback((dxPct: number, dyPct: number) => {
    const newX = (currentSettings.table_offset_x ?? 0) + (dxPct * CARD_WIDTH_MM) / 100;
    const newY = (currentSettings.table_offset_y ?? 0) + (dyPct * FRONT_HEIGHT_MM) / 100;
    onSettingsChange?.({
      table_offset_x: Math.round(newX * 10) / 10,
      table_offset_y: Math.round(newY * 10) / 10,
    });
  }, [currentSettings.table_offset_x, currentSettings.table_offset_y, onSettingsChange]);

  const handleTableSeatFontSize = useCallback((deltaPx: number) => {
    const newSize = Math.max(6, Math.min(80, currentSettings.info_font_size + Math.round(deltaPx)));
    onSettingsChange?.({ info_font_size: newSize });
  }, [currentSettings.info_font_size, onSettingsChange]);

  const handleTableSeatRotate = useCallback((degrees: number) => {
    onSettingsChange?.({ table_seat_rotation: degrees } as any);
  }, [onSettingsChange]);

  const handleTableSeatReset = useCallback(() => {
    onSettingsChange?.({
      table_offset_x: 0,
      table_offset_y: 0,
      info_font_size: 16,
      table_seat_rotation: 0,
    } as any);
  }, [onSettingsChange]);

  // Get table display value - prefer table name, fall back to table_no
  const getTableDisplay = () => {
    if (selectedTable?.name) return selectedTable.name;
    if (selectedTable?.table_no) return selectedTable.table_no;
    return '—';
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

  // Render empty card slot with background and fold line
  const renderEmptyCard = (index: number) => {
    return (
      <div
        key={`empty-${index}`}
        className="relative"
        style={{
          width: '105mm',
          height: '99mm',
          backgroundColor: currentSettings.background_color,
        }}
      >
        {/* CREASE LINE at Y = 49.5mm - same as real cards */}
        <div 
          className="absolute left-0 right-0" 
          style={{ 
            top: '49.5mm',
            borderTop: '0.5px solid #d3d3d3',
            opacity: 0.3,
            zIndex: 100
          }}
        />
      </div>
    );
  };

  const renderPlaceCard = (guest: Guest, cardIndex: number = 0) => {
    const tableDisplay = getTableDisplay();
    const tableInfo = guest.seat_no
      ? `Table ${tableDisplay}, Seat ${guest.seat_no}`
      : `Table ${tableDisplay}, Seat —`;

    const individualMessage = currentSettings.individual_messages?.[guest.id];
    const message = individualMessage || currentSettings.mass_message || '';

    const isFirstInteractive = editMode && !isExporting && cardIndex === 0 && onSettingsChange;
    const isDecorative = currentSettings.background_image_type === 'decorative' && !!currentSettings.background_image_url;

    // Compute interactive positions (percentages of front half container)
    const guestNameLeftPct = 50 + ((currentSettings.guest_name_offset_x ?? 0) / CARD_WIDTH_MM) * 100;
    const guestNameTopPct = (isDecorative ? 2 : 16) + ((currentSettings.guest_name_offset_y ?? 0) / FRONT_HEIGHT_MM) * 100;
    const tableSeatLeftPct = 50 + ((currentSettings.table_offset_x ?? 0) / CARD_WIDTH_MM) * 100;
    const tableSeatTopPct = (isDecorative ? 45 : 55) + ((currentSettings.table_offset_y ?? 0) / FRONT_HEIGHT_MM) * 100;
    const guestNameRotation = (currentSettings as any).guest_name_rotation ?? 0;
    const tableSeatRotation = (currentSettings as any).table_seat_rotation ?? 0;

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

        {/* Full Front of Card Image - only on front (bottom) half */}
        {currentSettings.background_image_url && currentSettings.background_image_type === 'full_front' && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: '49.5mm',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${currentSettings.background_image_url})`,
              backgroundPosition: `${currentSettings.background_image_x_position || 50}% ${currentSettings.background_image_y_position || 50}%`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              opacity: (currentSettings.background_image_opacity || 100) / 100,
            }}
          />
        )}

        {/* Full Back of Card Image - only on back (top) half, pre-rotated */}
        {currentSettings.background_image_url && currentSettings.background_image_type === 'full_back' && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: '49.5mm',
              backgroundImage: `url(${currentSettings.background_image_url})`,
              backgroundPosition: `${currentSettings.background_image_x_position || 50}% ${currentSettings.background_image_y_position || 50}%`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              opacity: (currentSettings.background_image_opacity || 100) / 100,
              transform: 'rotate(180deg)',
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
                fontFamily: currentSettings.message_font_family || currentSettings.info_font_family,
                fontSize: `${currentSettings.message_font_size || currentSettings.info_font_size}pt`,
                fontWeight: currentSettings.message_bold ? 'bold' : 'normal',
                fontStyle: currentSettings.message_italic ? 'italic' : 'normal',
                textDecoration: currentSettings.message_underline ? 'underline' : 'none',
                color: currentSettings.message_font_color || '#000000',
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
        {isFirstInteractive ? (
          /* ─── INTERACTIVE FRONT HALF ─── */
          <div 
            ref={frontHalfRef}
            className="relative z-10"
            style={{ 
              height: '49.5mm',
              overflow: 'visible',
            }}
            onClick={() => setSelectedElement(null)}
          >
            {/* Decorative center image (still rendered normally) */}
            {isDecorative && currentSettings.background_image_url && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: '22.5%',
                  top: '30%',
                  width: '55%',
                  height: '60%',
                  backgroundImage: `url(${currentSettings.background_image_url})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            )}

            {/* Guest Name - Interactive */}
             <InteractiveTextOverlay
              isSelected={selectedElement === 'guest_name'}
              onSelect={() => setSelectedElement('guest_name')}
              onMove={handleGuestNameMove}
              onFontSizeChange={handleGuestNameFontSize}
              onRotate={handleGuestNameRotate}
              onReset={handleGuestNameReset}
              onDuplicate={() => toast({ title: "Not available", description: "Guest Name is a fixed element and cannot be duplicated" })}
              onDelete={() => toast({ title: "Not available", description: "Guest Name is a fixed element and cannot be deleted" })}
              containerRef={frontHalfRef as React.RefObject<HTMLElement>}
              rotation={guestNameRotation}
              currentFontSize={currentSettings.guest_name_font_size}
              showResizeHandles={true}
              showRotateHandle={true}
              style={{
                left: `${guestNameLeftPct}%`,
                top: `${guestNameTopPct}%`,
                transform: `translateX(-50%) rotate(${guestNameRotation}deg)`,
                textAlign: 'center' as const,
                whiteSpace: 'nowrap',
              }}
            >
              <div
                style={{
                  fontFamily: currentSettings.guest_font_family,
                  fontWeight: currentSettings.guest_name_bold ? '700' : '400',
                  fontStyle: currentSettings.guest_name_italic ? 'italic' : 'normal',
                  textDecoration: currentSettings.guest_name_underline ? 'underline' : 'none',
                  fontSize: `${currentSettings.guest_name_font_size}pt`,
                }}
              >
                {currentSettings.background_behind_names ? (
                  <span style={{
                    background: 'white',
                    borderRadius: '9999px',
                    padding: '0.2mm 3mm',
                  }}>
                    {guest.first_name} {guest.last_name}
                  </span>
                ) : (
                  <>{guest.first_name} {guest.last_name}</>
                )}
              </div>
            </InteractiveTextOverlay>

            {/* Table/Seat Info - Interactive */}
             <InteractiveTextOverlay
              isSelected={selectedElement === 'table_seat'}
              onSelect={() => setSelectedElement('table_seat')}
              onMove={handleTableSeatMove}
              onFontSizeChange={handleTableSeatFontSize}
              onRotate={handleTableSeatRotate}
              onReset={handleTableSeatReset}
              onDuplicate={() => toast({ title: "Not available", description: "Table/Seat is a fixed element and cannot be duplicated" })}
              onDelete={() => toast({ title: "Not available", description: "Table/Seat is a fixed element and cannot be deleted" })}
              containerRef={frontHalfRef as React.RefObject<HTMLElement>}
              rotation={tableSeatRotation}
              currentFontSize={currentSettings.info_font_size}
              showResizeHandles={true}
              showRotateHandle={true}
              style={{
                left: `${tableSeatLeftPct}%`,
                top: `${tableSeatTopPct}%`,
                transform: `translateX(-50%) rotate(${tableSeatRotation}deg)`,
                textAlign: 'center' as const,
                whiteSpace: 'nowrap',
              }}
            >
              <div
                style={{
                  fontFamily: currentSettings.info_font_family,
                  fontSize: `${currentSettings.info_font_size}pt`,
                  fontWeight: currentSettings.info_bold ? '700' : undefined,
                  fontStyle: currentSettings.info_italic ? 'italic' : undefined,
                  textDecoration: currentSettings.info_underline ? 'underline' : undefined,
                  color: (currentSettings as any).info_font_color || '#000000',
                }}
              >
                {currentSettings.background_behind_table_seats ? (
                  <span style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '0.75mm 1.5mm',
                  }}>
                    {tableInfo}
                  </span>
                ) : (
                  <>{tableInfo}</>
                )}
              </div>
            </InteractiveTextOverlay>
          </div>
        ) : (
          /* ─── NORMAL FRONT HALF (non-interactive / export / print) ─── */
          <div 
            className="relative z-10 flex flex-col items-center justify-start"
            style={{ 
              height: '49.5mm',
              padding: '5mm',
              paddingTop: isDecorative ? '1mm' : '8mm'
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
                marginBottom: isDecorative ? '0mm' : `${currentSettings.name_spacing}mm`,
                transform: `translate(${currentSettings.guest_name_offset_x ?? 0}mm, ${currentSettings.guest_name_offset_y ?? 0}mm) rotate(${guestNameRotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              {currentSettings.background_behind_names ? (
                <div style={{
                  background: 'white',
                  borderRadius: '9999px',
                  padding: '0.2mm 3mm',
                  display: 'inline-block'
                }}>
                  {guest.first_name} {guest.last_name}
                </div>
              ) : (
                <>{guest.first_name} {guest.last_name}</>
              )}
            </div>
            
            {/* Table/Seat Info - Different layout for decorative mode */}
            {isDecorative ? (
              /* Three-column layout: Table | Image | Seat */
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  width: '100%',
                  marginTop: '0mm',
                }}
              >
                {/* Left - Table info stacked */}
                <div style={{ textAlign: 'center', minWidth: '18mm', transform: `translate(${currentSettings.table_offset_x ?? 0}mm, ${currentSettings.table_offset_y ?? 0}mm) rotate(${tableSeatRotation}deg)`, transformOrigin: 'center center' }}>
                  <div
                    style={{
                      fontFamily: currentSettings.info_font_family,
                      fontSize: `${currentSettings.info_font_size}pt`,
                      color: (currentSettings as any).info_font_color || '#000000',
                      fontWeight: currentSettings.info_bold ? '700' : undefined,
                      fontStyle: currentSettings.info_italic ? 'italic' : undefined,
                      textDecoration: currentSettings.info_underline ? 'underline' : undefined,
                    }}
                  >
                    Table
                  </div>
                  <div
                    style={{
                      fontFamily: currentSettings.info_font_family,
                      fontSize: `${(currentSettings.info_font_size || 10) + 2}pt`,
                      fontWeight: currentSettings.info_bold ? '700' : '600',
                      color: (currentSettings as any).info_font_color || '#000000',
                      fontStyle: currentSettings.info_italic ? 'italic' : undefined,
                      textDecoration: currentSettings.info_underline ? 'underline' : undefined,
                    }}
                  >
                    {tableDisplay}
                  </div>
                </div>

                {/* Center - Decorative Image */}
                <div
                  style={{
                    width: '55%',
                    height: '35mm',
                    backgroundImage: `url(${currentSettings.background_image_url})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                  }}
                />

                {/* Right - Seat info stacked */}
                <div style={{ textAlign: 'center', minWidth: '18mm', transform: `translate(${currentSettings.seat_offset_x ?? 0}mm, ${currentSettings.seat_offset_y ?? 0}mm) rotate(${tableSeatRotation}deg)`, transformOrigin: 'center center' }}>
                  <div
                    style={{
                      fontFamily: currentSettings.info_font_family,
                      fontSize: `${currentSettings.info_font_size}pt`,
                      color: (currentSettings as any).info_font_color || '#000000',
                      fontWeight: currentSettings.info_bold ? '700' : undefined,
                      fontStyle: currentSettings.info_italic ? 'italic' : undefined,
                      textDecoration: currentSettings.info_underline ? 'underline' : undefined,
                    }}
                  >
                    Seat
                  </div>
                  <div
                    style={{
                      fontFamily: currentSettings.info_font_family,
                      fontSize: `${(currentSettings.info_font_size || 10) + 2}pt`,
                      fontWeight: currentSettings.info_bold ? '700' : '600',
                      color: (currentSettings as any).info_font_color || '#000000',
                      fontStyle: currentSettings.info_italic ? 'italic' : undefined,
                      textDecoration: currentSettings.info_underline ? 'underline' : undefined,
                    }}
                  >
                    {guest.seat_no || '—'}
                  </div>
                </div>
              </div>
            ) : (
              /* Standard centered table/seat layout for other modes */
              <div
                style={{
                  fontFamily: currentSettings.info_font_family,
                  fontSize: `${currentSettings.info_font_size}pt`,
                  fontWeight: currentSettings.info_bold ? '700' : undefined,
                  fontStyle: currentSettings.info_italic ? 'italic' : undefined,
                  textDecoration: currentSettings.info_underline ? 'underline' : undefined,
                  transform: `translate(${currentSettings.table_offset_x ?? 0}mm, ${currentSettings.table_offset_y ?? 0}mm) rotate(${tableSeatRotation}deg)`,
                  transformOrigin: 'center center',
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
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
          {/* Screen Preview Only */}
          <div className="print:hidden">
            {/* Edit Mode Toggle + Pagination Controls */}
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

                    {/* 2x3 grid for 6 cards - always render all 6 positions */}
                    <div className="grid grid-cols-2 grid-rows-3" style={{ height: '297mm' }}>
                      {Array.from({ length: 6 }).map((_, index) => {
                        const guest = currentPageGuests[index];
                        return guest ? renderPlaceCard(guest, index) : renderEmptyCard(index);
                      })}
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

                  {/* Cards Grid - always render all 6 positions */}
                  <div className="grid grid-cols-2 grid-rows-3" style={{ height: '297mm' }}>
                    {Array.from({ length: 6 }).map((_, index) => {
                      const guest = pageGuests[index];
                      return guest ? renderPlaceCard(guest) : renderEmptyCard(index);
                    })}
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
