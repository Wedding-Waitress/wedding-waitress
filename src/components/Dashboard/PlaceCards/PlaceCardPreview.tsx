/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Place Cards feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated 300 DPI export system.
 * 
 * LOCKED FEATURES (2026-03-19):
 * - Global text sync / master-slave mirroring architecture
 * - committedOverrides / draftOverrides state pipeline
 * - Re-keying strategy (overlayKey) for post-interaction DOM cleanup
 * - effectiveSettings hierarchy (Saved → Committed → Draft)
 * 
 * Last completed: 2025-10-04
 * Updated: 2025-10-26 - Added Full Seating Chart-style layout with pagination controls
 * Locked: 2026-03-19 - Text positioning & sync feature locked
 */

import React, { forwardRef, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { Guest } from '@/hooks/useGuests';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { InteractiveTextOverlay } from '@/components/ui/InteractiveTextOverlay';
import { useToast } from '@/hooks/use-toast';

// Monotonic counter for re-keying interactive overlays after commit
let _overlayKeyCounter = 0;

interface PlaceCardPreviewProps {
  settings: PlaceCardSettings | null;
  guests: Guest[];
  event: any;
  isExporting?: boolean;
  focusedPage?: number | null;
  selectedTable?: { name: string; table_no?: number | null } | null;
  textEditMode?: boolean;
  onSettingsChange?: (settings: Partial<PlaceCardSettings>) => Promise<boolean>;
}

interface DraftOverrides {
  guestDx?: number;
  guestDy?: number;
  guestRotation?: number;
  guestFontSize?: number;
  tableDx?: number;
  tableDy?: number;
  tableRotation?: number;
  tableFontSize?: number;
}

export const PlaceCardPreview = forwardRef<HTMLDivElement, PlaceCardPreviewProps>(({
  settings,
  guests,
  event,
  isExporting = false,
  focusedPage = null,
  selectedTable = null,
  textEditMode = false,
  onSettingsChange,
}, ref) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedElement, setSelectedElement] = useState<'guest-name' | 'table-seat' | null>(null);
  const [draftOverrides, setDraftOverrides] = useState<DraftOverrides | null>(null);
  const [committedOverrides, setCommittedOverrides] = useState<Partial<PlaceCardSettings>>({});
  const [overlayKey, setOverlayKey] = useState(0);
  const firstCardRef = useRef<HTMLDivElement>(null);
  const prevSettingsRef = useRef(settings);
  const { toast } = useToast();
  
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
    guest_name_font_size: 30,
    info_font_size: 16,
    name_spacing: 4,
    info_bold: false,
    info_italic: false,
    info_underline: false,
    info_font_color: '#000000',
    background_behind_names: false,
    background_behind_table_seats: false,
    guest_name_offset_x: 0,
    guest_name_offset_y: 0,
    table_offset_x: 0,
    table_offset_y: 0,
    seat_offset_x: 0,
    seat_offset_y: 0,
    guest_name_rotation: 0,
    table_seat_rotation: 0,
  };

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

  // Clear selection when edit mode is turned off
  React.useEffect(() => {
    if (!textEditMode) {
      setSelectedElement(null);
      setDraftOverrides(null);
      setCommittedOverrides({});
    }
  }, [textEditMode]);

  // Clear committed overrides once the settings prop has been updated (optimistic or server)
  React.useEffect(() => {
    if (settings !== prevSettingsRef.current) {
      prevSettingsRef.current = settings;
      setCommittedOverrides({});
    }
  }, [settings]);

  // Force InteractiveTextOverlay to remount with clean state from React props
  // This replaces the old clearMasterInlineStyles approach which destructively wiped
  // left/top/transform and caused the jump-to-top-left bug
  const bumpOverlayKey = useCallback(() => {
    _overlayKeyCounter += 1;
    setOverlayKey(_overlayKeyCounter);
  }, []);

  // Card dimensions in mm for coordinate conversion
  const CARD_WIDTH_MM = 105;
  const FRONT_HEIGHT_MM = 49.5;

   // Shared anchor points (percentage of front half) — centered pair with spacing
   const GUEST_ANCHOR_X = 50;
   const spacingHalf = (currentSettings.name_spacing ?? 4) / 2;
   const GUEST_ANCHOR_Y = 42 - spacingHalf;
   const TABLE_ANCHOR_X = 50;
   const TABLE_ANCHOR_Y = 62 + spacingHalf;

  const handleInteractiveMove = useCallback((element: 'guest-name' | 'table-seat', dxPercent: number, dyPercent: number) => {
    if (!onSettingsChange) return;
    const dxMm = (dxPercent / 100) * CARD_WIDTH_MM;
    const dyMm = (dyPercent / 100) * FRONT_HEIGHT_MM;

    if (element === 'guest-name') {
      const curX = Number(committedOverrides.guest_name_offset_x ?? currentSettings.guest_name_offset_x ?? 0);
      const curY = Number(committedOverrides.guest_name_offset_y ?? currentSettings.guest_name_offset_y ?? 0);
      const newX = Math.round((curX + dxMm) * 10) / 10;
      const newY = Math.round((curY + dyMm) * 10) / 10;
      setCommittedOverrides(prev => ({ ...prev, guest_name_offset_x: newX, guest_name_offset_y: newY }));
      setDraftOverrides(null);
      bumpOverlayKey();
      onSettingsChange({ guest_name_offset_x: newX, guest_name_offset_y: newY });
    } else {
      const curX = Number(committedOverrides.table_offset_x ?? currentSettings.table_offset_x ?? 0);
      const curY = Number(committedOverrides.table_offset_y ?? currentSettings.table_offset_y ?? 0);
      const newX = Math.round((curX + dxMm) * 10) / 10;
      const newY = Math.round((curY + dyMm) * 10) / 10;
      setCommittedOverrides(prev => ({ ...prev, table_offset_x: newX, table_offset_y: newY }));
      setDraftOverrides(null);
      bumpOverlayKey();
      onSettingsChange({ table_offset_x: newX, table_offset_y: newY });
    }
  }, [onSettingsChange, currentSettings, committedOverrides, bumpOverlayKey]);

  const handleInteractiveRotate = useCallback((element: 'guest-name' | 'table-seat', degrees: number) => {
    if (!onSettingsChange) return;
    if (element === 'guest-name') {
      setCommittedOverrides(prev => ({ ...prev, guest_name_rotation: degrees }));
      setDraftOverrides(null);
      bumpOverlayKey();
      onSettingsChange({ guest_name_rotation: degrees });
    } else {
      setCommittedOverrides(prev => ({ ...prev, table_seat_rotation: degrees }));
      setDraftOverrides(null);
      bumpOverlayKey();
      onSettingsChange({ table_seat_rotation: degrees });
    }
  }, [onSettingsChange, bumpOverlayKey]);

  const handleInteractiveReset = useCallback((element: 'guest-name' | 'table-seat') => {
    if (!onSettingsChange) return;
    if (element === 'guest-name') {
      const resetValues = { guest_name_offset_x: 0, guest_name_offset_y: 0, guest_name_rotation: 0, guest_name_font_size: 30 };
      setCommittedOverrides(prev => ({ ...prev, ...resetValues }));
      onSettingsChange(resetValues);
    } else {
      const resetValues = { table_offset_x: 0, table_offset_y: 0, table_seat_rotation: 0, info_font_size: 16 };
      setCommittedOverrides(prev => ({ ...prev, ...resetValues }));
      onSettingsChange(resetValues);
    }
    setDraftOverrides(null);
    bumpOverlayKey();

    toast({ title: "Reset", description: `${element === 'guest-name' ? 'Guest Name' : 'Table & Seat'} fully reset to default` });
  }, [onSettingsChange, toast, bumpOverlayKey]);

  const handleFontSizeChange = useCallback((element: 'guest-name' | 'table-seat', deltaPx: number) => {
    if (!onSettingsChange) return;
    if (element === 'guest-name') {
      const cur = Number(committedOverrides.guest_name_font_size ?? currentSettings.guest_name_font_size ?? 40);
      const newSize = Math.max(8, Math.min(120, cur + deltaPx));
      setCommittedOverrides(prev => ({ ...prev, guest_name_font_size: newSize }));
      setDraftOverrides(null);
      bumpOverlayKey();
      onSettingsChange({ guest_name_font_size: newSize });
    } else {
      const cur = Number(committedOverrides.info_font_size ?? currentSettings.info_font_size ?? 16);
      const newSize = Math.max(6, Math.min(60, cur + deltaPx));
      setCommittedOverrides(prev => ({ ...prev, info_font_size: newSize }));
      setDraftOverrides(null);
      bumpOverlayKey();
      onSettingsChange({ info_font_size: newSize });
    }
  }, [onSettingsChange, currentSettings, committedOverrides, bumpOverlayKey]);

  // Live mirroring callbacks — update draft state so passive cards follow in real time
  const handleLiveGuestMove = useCallback((dxPct: number, dyPct: number) => {
    setDraftOverrides(prev => ({ ...prev, guestDx: dxPct, guestDy: dyPct }));
  }, []);

  const handleLiveGuestRotate = useCallback((deg: number) => {
    setDraftOverrides(prev => ({ ...prev, guestRotation: deg }));
  }, []);

  const handleLiveGuestFontSize = useCallback((size: number) => {
    setDraftOverrides(prev => ({ ...prev, guestFontSize: size }));
  }, []);

  const handleLiveTableMove = useCallback((dxPct: number, dyPct: number) => {
    setDraftOverrides(prev => ({ ...prev, tableDx: dxPct, tableDy: dyPct }));
  }, []);

  const handleLiveTableRotate = useCallback((deg: number) => {
    setDraftOverrides(prev => ({ ...prev, tableRotation: deg }));
  }, []);

  const handleLiveTableFontSize = useCallback((size: number) => {
    setDraftOverrides(prev => ({ ...prev, tableFontSize: size }));
  }, []);

  const renderPlaceCard = (guest: Guest, isFirstCard: boolean = false) => {
    const tableDisplay = getTableDisplay();
    const tableInfo = guest.seat_no
      ? `Table ${tableDisplay}, Seat ${guest.seat_no}`
      : `Table ${tableDisplay}, Seat —`;

    const individualMessage = currentSettings.individual_messages?.[guest.id];
    const message = individualMessage || currentSettings.mass_message || '';

    const isInteractive = textEditMode && isFirstCard;
    // Passive cards use draft overrides for live mirroring; master card is driven by InteractiveTextOverlay DOM
    const useDraft = !isInteractive;

    // --- Shared position calculations (one global model) ---
    // Effective offsets: committed overrides take priority over persisted settings
    const effGuestOffsetX = Number(committedOverrides.guest_name_offset_x ?? currentSettings.guest_name_offset_x ?? 0);
    const effGuestOffsetY = Number(committedOverrides.guest_name_offset_y ?? currentSettings.guest_name_offset_y ?? 0);
    const effGuestRotation = Number(committedOverrides.guest_name_rotation ?? currentSettings.guest_name_rotation ?? 0);
    const effGuestFontSize = Number(committedOverrides.guest_name_font_size ?? currentSettings.guest_name_font_size ?? 40);
    const effTableOffsetX = Number(committedOverrides.table_offset_x ?? currentSettings.table_offset_x ?? 0);
    const effTableOffsetY = Number(committedOverrides.table_offset_y ?? currentSettings.table_offset_y ?? 0);
    const effTableRotation = Number(committedOverrides.table_seat_rotation ?? currentSettings.table_seat_rotation ?? 0);
    const effTableFontSize = Number(committedOverrides.info_font_size ?? currentSettings.info_font_size ?? 16);

    const guestPos = {
      x: GUEST_ANCHOR_X + (effGuestOffsetX / CARD_WIDTH_MM) * 100 + (useDraft ? (draftOverrides?.guestDx ?? 0) : 0),
      y: GUEST_ANCHOR_Y + (effGuestOffsetY / FRONT_HEIGHT_MM) * 100 + (useDraft ? (draftOverrides?.guestDy ?? 0) : 0),
      rotation: useDraft && draftOverrides?.guestRotation !== undefined ? draftOverrides.guestRotation : effGuestRotation,
      fontSize: useDraft && draftOverrides?.guestFontSize !== undefined ? draftOverrides.guestFontSize : effGuestFontSize,
    };

    const tablePos = {
      x: TABLE_ANCHOR_X + (effTableOffsetX / CARD_WIDTH_MM) * 100 + (useDraft ? (draftOverrides?.tableDx ?? 0) : 0),
      y: TABLE_ANCHOR_Y + (effTableOffsetY / FRONT_HEIGHT_MM) * 100 + (useDraft ? (draftOverrides?.tableDy ?? 0) : 0),
      rotation: useDraft && draftOverrides?.tableRotation !== undefined ? draftOverrides.tableRotation : effTableRotation,
      fontSize: useDraft && draftOverrides?.tableFontSize !== undefined ? draftOverrides.tableFontSize : effTableFontSize,
    };

    // --- Shared base styles ---
    const guestNameBaseStyle: React.CSSProperties = {
      fontFamily: currentSettings.guest_font_family,
      fontWeight: currentSettings.guest_name_bold ? '700' : '400',
      fontStyle: currentSettings.guest_name_italic ? 'italic' : 'normal',
      textDecoration: currentSettings.guest_name_underline ? 'underline' : 'none',
    };

    const tableInfoBaseStyle: React.CSSProperties = {
      fontFamily: currentSettings.info_font_family,
      fontWeight: currentSettings.info_bold ? '700' : undefined,
      fontStyle: currentSettings.info_italic ? 'italic' : undefined,
      textDecoration: currentSettings.info_underline ? 'underline' : undefined,
      color: currentSettings.info_font_color || currentSettings.font_color,
    };

    // --- Shared absolute positioning style builder ---
    // Always uses full-width centering (left:0, width:100%, textAlign:center)
    // so script fonts appear visually centered across the entire card width.
    // Horizontal drag offsets are applied via asymmetric padding to preserve centering.
    const buildAbsoluteStyle = (
      baseStyle: React.CSSProperties,
      pos: { x: number; y: number; rotation: number; fontSize: number },
      unit: string = 'pt'
    ): React.CSSProperties => {
      const xShift = pos.x - 50;
      return {
        ...baseStyle,
        position: 'absolute' as const,
        left: 0,
        width: '100%',
        top: `${pos.y}%`,
        transform: `translateY(-50%) rotate(${pos.rotation}deg)`,
        transformOrigin: 'center center',
        textAlign: 'center' as const,
        whiteSpace: 'nowrap' as const,
        fontSize: `${pos.fontSize}${unit}`,
        ...(Math.abs(xShift) > 0.01 ? {
          paddingLeft: xShift > 0 ? `${xShift * 2}%` : undefined,
          paddingRight: xShift < 0 ? `${Math.abs(xShift) * 2}%` : undefined,
        } : {}),
      };
    };

    // --- Content renderers ---
    const guestNameContent = currentSettings.background_behind_names ? (
      <div style={{ background: 'white', borderRadius: '9999px', padding: '0.2mm 3mm', display: 'inline-block' }}>
        {guest.first_name} {guest.last_name}
      </div>
    ) : (
      <>{guest.first_name} {guest.last_name}</>
    );

    const tableSeatContent = currentSettings.background_behind_table_seats ? (
      <div style={{ background: 'white', borderRadius: '12px', padding: '0.75mm 1.5mm', display: 'inline-block' }}>
        {tableInfo}
      </div>
    ) : (
      <>{tableInfo}</>
    );

    return (
      <div
        key={guest.id}
        className="relative"
        style={{
          width: '105mm',
          height: '99mm',
          backgroundColor: currentSettings.background_color,
          color: currentSettings.font_color,
          zIndex: isInteractive ? 200 : undefined,
        }}
        onClick={isInteractive ? () => setSelectedElement(null) : undefined}
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

        {/* FRONT Half (Bottom) - GUEST NAME + TABLE/SEAT — unified absolute positioning for all cards */}
        <div 
          ref={isFirstCard ? firstCardRef : undefined}
          className="relative z-10"
          style={{ 
            height: '49.5mm',
            position: 'relative',
            overflow: isInteractive ? 'visible' : 'hidden',
          }}
        >
          {/* Guest Name — always absolutely positioned from shared model */}
          {isInteractive ? (
            <InteractiveTextOverlay
              key={`guest-overlay-${overlayKey}`}
              hideSideHandles
              isSelected={selectedElement === 'guest-name'}
              onSelect={() => setSelectedElement('guest-name')}
              onMove={(dx, dy) => handleInteractiveMove('guest-name', dx, dy)}
              onRotate={(deg) => handleInteractiveRotate('guest-name', deg)}
              onReset={() => handleInteractiveReset('guest-name')}
              onFontSizeChange={(delta) => handleFontSizeChange('guest-name', delta)}
              onLiveMove={handleLiveGuestMove}
              onLiveRotate={handleLiveGuestRotate}
              onLiveFontSize={handleLiveGuestFontSize}
              containerRef={firstCardRef as React.RefObject<HTMLElement>}
              rotation={effGuestRotation}
              currentFontSize={effGuestFontSize}
              style={buildAbsoluteStyle(guestNameBaseStyle, guestPos)}
            >
              {guestNameContent}
            </InteractiveTextOverlay>
          ) : (
            <div style={buildAbsoluteStyle(guestNameBaseStyle, guestPos)}>
              {guestNameContent}
            </div>
          )}
          
          {/* Table/Seat Info */}
          {currentSettings.background_image_type === 'decorative' && currentSettings.background_image_url ? (
            /* Three-column layout: Table | Image | Seat — decorative keeps its own layout */
            <div
              style={{
                position: 'absolute',
                bottom: '2mm',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '0 5mm',
              }}
            >
              {/* Left - Table info stacked */}
              <div style={{ textAlign: 'center', minWidth: '18mm', transform: `translate(${currentSettings.table_offset_x ?? 0}mm, ${currentSettings.table_offset_y ?? 0}mm) rotate(${(currentSettings as any).table_seat_rotation ?? 0}deg)`, transformOrigin: 'center center' }}>
                <div style={{ fontFamily: currentSettings.info_font_family, fontSize: `${currentSettings.info_font_size}pt`, color: currentSettings.info_font_color || currentSettings.font_color, fontWeight: currentSettings.info_bold ? '700' : undefined, fontStyle: currentSettings.info_italic ? 'italic' : undefined, textDecoration: currentSettings.info_underline ? 'underline' : undefined }}>
                  Table
                </div>
                <div style={{ fontFamily: currentSettings.info_font_family, fontSize: `${(currentSettings.info_font_size || 10) + 2}pt`, fontWeight: currentSettings.info_bold ? '700' : '600', color: currentSettings.info_font_color || currentSettings.font_color, fontStyle: currentSettings.info_italic ? 'italic' : undefined, textDecoration: currentSettings.info_underline ? 'underline' : undefined }}>
                  {tableDisplay}
                </div>
              </div>

              {/* Center - Decorative Image */}
              <div style={{ width: '55%', height: '35mm', backgroundImage: `url(${currentSettings.background_image_url})`, backgroundPosition: 'center', backgroundSize: 'contain', backgroundRepeat: 'no-repeat' }} />

              {/* Right - Seat info stacked */}
              <div style={{ textAlign: 'center', minWidth: '18mm', transform: `translate(${currentSettings.seat_offset_x ?? 0}mm, ${currentSettings.seat_offset_y ?? 0}mm) rotate(${(currentSettings as any).table_seat_rotation ?? 0}deg)`, transformOrigin: 'center center' }}>
                <div style={{ fontFamily: currentSettings.info_font_family, fontSize: `${currentSettings.info_font_size}pt`, color: currentSettings.info_font_color || currentSettings.font_color, fontWeight: currentSettings.info_bold ? '700' : undefined, fontStyle: currentSettings.info_italic ? 'italic' : undefined, textDecoration: currentSettings.info_underline ? 'underline' : undefined }}>
                  Seat
                </div>
                <div style={{ fontFamily: currentSettings.info_font_family, fontSize: `${(currentSettings.info_font_size || 10) + 2}pt`, fontWeight: currentSettings.info_bold ? '700' : '600', color: currentSettings.info_font_color || currentSettings.font_color, fontStyle: currentSettings.info_italic ? 'italic' : undefined, textDecoration: currentSettings.info_underline ? 'underline' : undefined }}>
                  {guest.seat_no || '—'}
                </div>
              </div>
            </div>
          ) : (
            /* Standard centered table/seat — always absolutely positioned from shared model */
            isInteractive ? (
              <InteractiveTextOverlay
                key={`table-overlay-${overlayKey}`}
                hideSideHandles
                isSelected={selectedElement === 'table-seat'}
                onSelect={() => setSelectedElement('table-seat')}
                onMove={(dx, dy) => handleInteractiveMove('table-seat', dx, dy)}
                onRotate={(deg) => handleInteractiveRotate('table-seat', deg)}
                onReset={() => handleInteractiveReset('table-seat')}
                onFontSizeChange={(delta) => handleFontSizeChange('table-seat', delta)}
                onLiveMove={handleLiveTableMove}
                onLiveRotate={handleLiveTableRotate}
                onLiveFontSize={handleLiveTableFontSize}
                containerRef={firstCardRef as React.RefObject<HTMLElement>}
                rotation={effTableRotation}
                currentFontSize={effTableFontSize}
                style={buildAbsoluteStyle(tableInfoBaseStyle, tablePos)}
              >
                {tableSeatContent}
              </InteractiveTextOverlay>
            ) : (
              <div style={buildAbsoluteStyle(tableInfoBaseStyle, tablePos)}>
                {tableSeatContent}
              </div>
            )
          )}
        </div>
      </div>
    );
  };

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

  if (!guests.length) {
    return (
      <div className="py-8 text-center text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
        <p>No assigned guests found.</p>
        <p className="text-sm">Assign guests to tables to see place cards preview.</p>
      </div>
    );
  }

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

                    {/* 2x3 grid for 6 cards - always render all 6 positions */}
                    <div className="grid grid-cols-2 grid-rows-3" style={{ height: '297mm' }}>
                      {Array.from({ length: 6 }).map((_, index) => {
                        const guest = currentPageGuests[index];
                        // First card on the active page is always the master/interactive card
                        const isFirstCard = index === 0;
                        return guest ? renderPlaceCard(guest, isFirstCard) : renderEmptyCard(index);
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
