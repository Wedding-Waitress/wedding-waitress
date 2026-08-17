/**
 * ============================================================================
 * 🔒 PRODUCTION LOCKED - DO NOT MODIFY 🔒
 * ============================================================================
 * 
 * ⚠️ THIS COMPONENT IS LOCKED FOR PRODUCTION USE ⚠️
 * 
 * ANY MODIFICATIONS TO THIS FILE REQUIRE EXPLICIT WRITTEN APPROVAL FROM OWNER
 * Print measurements have been precisely calibrated. Changes will break layouts.
 * 
 * This component renders the Full Seating Chart preview with screen and print
 * versions, using exact A4 dimensions and carefully calibrated spacing.
 * 
 * CRITICAL MEASUREMENTS (DO NOT CHANGE):
 * - A4 dimensions: 794px × 1123px (210mm × 297mm at 96 DPI)
 * - Page margins: 45px (12mm)
 * - Header height: 120px minimum
 * - Guest list height: 913px available
 * - Column gap: 12mm
 * - Guests per column: 10
 * - Guests per page: 20
 * 
 * PRINT SPECIFICATIONS:
 * - Paper size: A4 portrait
 * - Margins: 12mm
 * - Logo height: 48px (screen), appropriate print size
 * - Font sizes: Configurable via settings (small/medium/large)
 * 
 * FEATURES:
 * - Interactive checkboxes for guest check-off
 * - Multi-page pagination support
 * - Professional print layout with exact measurements
 * - Optional dietary and relationship display
 * - Date formatting with ordinal suffixes
 * 
 * Last locked: 2025-10-19
 * Status: PRODUCTION READY - NO CHANGES ALLOWED
 * ============================================================================
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Checkbox replaced with SVG circle to match PDF output
import { Guest } from '@/hooks/useGuests';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Users, ChevronLeft, ChevronRight } from 'lucide-react';

import {
  PAGE_WIDTH_MM, PAGE_HEIGHT_MM, MARGIN_TOP_MM, MARGIN_LEFT_MM,
  HEADER_HEIGHT_MM, CONTENT_START_MM, CONTENT_HEIGHT_MM, COLUMN_GAP_MM,
  FOOTER_START_MM, getFullSeatingChartGuestsPerColumn, getFullSeatingChartRowHeightMm,
  paginateGuests,
} from '@/lib/fullSeatingChartLayout';
import { getFullSeatingChartGuestDetails } from '@/lib/fullSeatingChartDisplaySettings';
import { FULL_SEATING_CHART_GUEST_TEXT_SIZES } from '@/lib/fullSeatingChartDisplaySettings';
import { A4_PAGE_STYLE, A4_PX } from '@/lib/a4';

interface FullSeatingChartPreviewProps {
  event: any;
  guests: Guest[];
  settings: FullSeatingChartSettings;
  tableNameMap?: Record<number, string>;
  tableIdNameMap?: Record<string, string>;
}

export const FullSeatingChartPreview: React.FC<FullSeatingChartPreviewProps> = ({
  event,
  guests,
  settings,
  tableNameMap = {},
  tableIdNameMap = {},
}) => {
  const [checkedGuests, setCheckedGuests] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const computePreviewScale = () => {
      const availableWidth = previewWrapperRef.current?.clientWidth ?? window.innerWidth;
      setPreviewScale(Math.min(1, availableWidth / A4_PX.width));
    };

    computePreviewScale();
    window.addEventListener('resize', computePreviewScale);

    let resizeObserver: ResizeObserver | undefined;
    if (previewWrapperRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(computePreviewScale);
      resizeObserver.observe(previewWrapperRef.current);
    }

    return () => {
      window.removeEventListener('resize', computePreviewScale);
      resizeObserver?.disconnect();
    };
  }, []);

  /**
   * AUTOFIT CALCULATION - Dynamic guests per page based on font size and visible fields
   * 
   * A4 dimensions: 297mm height
   * Margins: 12.7mm top + 12.7mm bottom = 25.4mm
   * Header section: ~22mm (event name, chart title, stats line, border)
   * Footer section: 15mm (reserved for logo)
   * Available for guests: 297 - 25.4 - 22 - 15 = 234.6mm ≈ 234mm
   */
  const paginationInfo = useMemo(() => {
    const guestsPerColumn = getFullSeatingChartGuestsPerColumn(settings.fontSize);
    const pages = paginateGuests(guests, settings.fontSize);
    return { pages, guestsPerColumn, guestsPerPage: guestsPerColumn * 2 };
  }, [guests, settings.fontSize]);

  const totalPages = paginationInfo.pages.length;
  const currentPageInfo = paginationInfo.pages[currentPage - 1] || { guests: [], col1Count: 0 };
  const currentGuests = currentPageInfo.guests;
  const col1Guests = currentGuests.slice(0, currentPageInfo.col1Count);
  const col2Guests = currentGuests.slice(currentPageInfo.col1Count);

  // Format table display - use name from map if available
  const formatTableDisplay = (guest: Guest) => {
    if (guest.table_no) return tableNameMap[guest.table_no] || `Table ${guest.table_no}`;
    if (guest.table_id && tableIdNameMap[guest.table_id]) return tableIdNameMap[guest.table_id];
    return 'Unassigned';
  };

  // Format guest name - full name (first + last)
  const formatGuestName = (guest: Guest) => {
    return `${guest.first_name} ${guest.last_name || ''}`.trim();
  };

  const guestTextSizePt = FULL_SEATING_CHART_GUEST_TEXT_SIZES[settings.fontSize];

  // Safety check: return null if event is not provided
  if (!event) {
    return null;
  }

  const handleGuestCheck = (guestId: string, checked: boolean) => {
    const newChecked = new Set(checkedGuests);
    if (checked) {
      newChecked.add(guestId);
    } else {
      newChecked.delete(guestId);
    }
    setCheckedGuests(newChecked);
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

  const formatGeneratedTimestamp = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    return `${dateStr} ${timeStr}`;
  };

  const formatTimeDisplay = (time: string | null | undefined): string => {
    if (!time) return 'TBD';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const rowHeightMm = getFullSeatingChartRowHeightMm(settings.fontSize);
  const GuestDetails = ({ guest, print = false }: { guest: Guest; print?: boolean }) => {
    const { dietary, relationship } = getFullSeatingChartGuestDetails(
      guest,
      settings.showDietary,
      settings.showRelation,
    );
    if (!dietary && !relationship) return null;

    return (
      <span className={print ? 'print-guest-info' : 'leading-tight'} style={print ? undefined : { fontSize: `${guestTextSizePt}pt` }}>
        {' '}(
        {dietary && <span data-dietary-text="true" style={{ color: settings.dietaryColor }}>{dietary}</span>}
        {dietary && relationship && <span style={{ color: '#000000' }}>/</span>}
        {relationship && <span data-relationship-text="true" style={{ color: settings.relationshipColor }}>{relationship}</span>}
        )
      </span>
    );
  };

  // Build text style classes based on settings
  const getTextStyleClasses = () => {
    const classes: string[] = [];
    if (settings.isBold) classes.push('font-bold');
    if (settings.isItalic) classes.push('italic');
    if (settings.isUnderline) classes.push('underline');
    return classes.join(' ');
  };

  // Screen version guest row - matches PDF layout exactly
  const ScreenGuestRow = ({ guest }: { guest: Guest }) => {
    const tableText = formatTableDisplay(guest);
    const textStyleClasses = getTextStyleClasses();
    return (
      <div 
        data-full-seating-guest-row="true"
        className="flex items-center gap-1.5 px-0.5 cursor-pointer overflow-hidden box-border"
        style={{ 
          height: `${rowHeightMm}mm`,
          paddingTop: '3.5pt',
          paddingBottom: '3.5pt',
          borderBottom: `1px solid ${settings.guestListColor}`,
        }}
        onClick={() => handleGuestCheck(guest.id, !checkedGuests.has(guest.id))}
      >
        {/* Black check-off circle; field colour controls never recolour it. */}
        <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="#000000" strokeWidth="1.2" />
          {checkedGuests.has(guest.id) && (
            <path d="M4.5 7L6.5 9L9.5 5" stroke="#000000" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        <div className="flex-1 min-w-0 truncate">
          {settings.showGuestNames && (
            <span data-guest-name-text="true" className={`${textStyleClasses} leading-tight`} style={{ color: settings.guestNameColor, fontSize: `${guestTextSizePt}pt` }}>
              {formatGuestName(guest)}
            </span>
          )}
          <GuestDetails guest={guest} />
        </div>
        {settings.showSeatNumbers && <span
          data-seat-assignment-text="true"
          className={`${textStyleClasses} flex-shrink-0 whitespace-nowrap`}
          style={{ color: settings.seatNumberColor, fontSize: `${guestTextSizePt}pt` }}
        >
          {tableText}
        </span>}
      </div>
    );
  };

  // Print version guest row - single-line with inline brackets
  const PrintGuestRow = ({ guest }: { guest: Guest }) => {
    return (
      <div data-full-seating-guest-row="true" className="print-guest-item" style={{ borderBottom: `1px solid ${settings.guestListColor}` }}>
        <span className="print-checkbox">☐</span>
        <div className="print-guest-content" style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {settings.showGuestNames && <span className="print-guest-name" style={{ color: settings.guestNameColor }}>{formatGuestName(guest)}</span>}
          <GuestDetails guest={guest} print />
        </div>
        {settings.showSeatNumbers && <span className="print-table" style={{ color: settings.seatNumberColor }}>
          {formatTableDisplay(guest)}
        </span>}
      </div>
    );
  };

  return (
    <>
      {/* Print Styles - Must be at component root */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0; /* Remove browser headers/footers */
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          
          .print-page {
            position: relative;
            width: 210mm;
            height: 297mm;
            padding: 10mm;
            display: flex;
            flex-direction: column;
            background-color: white !important;
            color: #000000;
            box-sizing: border-box;
          }
          
        .print-header {
          text-align: center;
          margin-bottom: 3mm;
        }

        .print-footer-section {
          position: absolute;
          left: 12.7mm;
          right: 12.7mm;
          bottom: 10mm;
          min-height: 12mm;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          color: #000;
          font-size: 8pt;
          line-height: 1;
        }

        .print-footer-section img {
          width: 36mm;
          height: 10mm;
          object-fit: contain;
        }

        .print-event-name {
          font-size: 22px;
          font-weight: bold;
          margin: 0 0 4px 0;
          color: #000000;
        }

        .print-chart-subtitle {
          font-size: 16px;
          font-weight: normal;
          margin: 0 0 4px 0;
          color: #000;
        }

        .print-detail-line {
          font-size: 12px;
          color: #000000;
          margin: 2px 0;
        }
          
          .print-divider {
            border-top: 2px solid #000000;
            margin: 8px 0 14px 0;
          }

          .print-column-header-bar {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 12mm;
            background: #f3f3f3;
            border-bottom: 2px solid #000000;
            padding: 4px 2px;
            margin-bottom: 4px;
          }

          .print-column-header {
            font-size: 10pt;
            font-weight: bold;
            color: #000;
            text-transform: uppercase;
            padding: 0 2px;
          }
          
          .print-guest-list {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 12mm;
            align-items: start;
            margin-top: 0;
            overflow: hidden;
          }
          
          .print-guest-column {
            display: flex;
            flex-direction: column;
          }
          
          .print-guest-item {
            display: flex;
            align-items: center;
            gap: 6px;
            break-inside: avoid;
            font-size: ${guestTextSizePt}pt;
            line-height: 1.15;
            height: ${rowHeightMm}mm;
            box-sizing: border-box;
            color: #000;
            padding: 3.5pt 2px;
          }
          
          .print-guest-content {
            display: flex;
            flex-direction: row;
            align-items: center;
            flex: 1;
            min-width: 0;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
          
          .print-checkbox {
            font-family: monospace;
            font-size: 9pt;
            flex-shrink: 0;
          }
          
          .print-guest-name {
            font-weight: ${settings.isBold ? '700' : '400'};
            font-style: ${settings.isItalic ? 'italic' : 'normal'};
            text-decoration: ${settings.isUnderline ? 'underline' : 'none'};
            color: #000;
          }
          
          .print-guest-info {
            font-size: ${guestTextSizePt}pt;
            color: #000000;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .print-table {
            font-weight: ${settings.isBold ? '700' : '400'};
            font-style: ${settings.isItalic ? 'italic' : 'normal'};
            text-decoration: ${settings.isUnderline ? 'underline' : 'none'};
            white-space: nowrap;
            flex-shrink: 0;
            color: #000000;
          }
          
          .print-table-unassigned {
            color: #967A59;
          }
          
        }
      `}</style>

      {/* Screen Version - A4 Paper Preview */}
      <div className="print:hidden">
        {/* Page Navigation Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              className="border border-[#472c1d] text-[#472c1d]"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" strokeWidth={1.8} aria-hidden="true" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border border-[#472c1d] text-[#472c1d]"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" strokeWidth={1.8} aria-hidden="true" />
            </Button>
          </div>
        )}

        {/* A4 Paper Container - Fixed zone layout: Header | Content | Footer */}
        <div className="flex justify-center">
          <div
            ref={previewWrapperRef}
            data-a4-preview-wrapper="true"
            className="w-full"
            style={
              previewScale < 1
                ? { height: `${A4_PX.height * previewScale}px`, overflow: 'hidden', display: 'flex', justifyContent: 'center', width: '100%' }
                : undefined
            }
          >
            <div
              style={
                previewScale < 1
                  ? { transform: `scale(${previewScale})`, transformOrigin: 'top center', width: A4_PAGE_STYLE.width, margin: '0 auto' }
                  : undefined
              }
            >
              <div
                data-a4-preview-page="true"
                className="bg-white border border-gray-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] mx-auto"
                style={{
                  ...A4_PAGE_STYLE,
                  minWidth: A4_PAGE_STYLE.width,
                  maxWidth: A4_PAGE_STYLE.width,
                  minHeight: A4_PAGE_STYLE.height,
                  boxSizing: 'border-box',
                  color: '#000000',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
            {/* ── ZONE 1: HEADER (fixed position & height) ── */}
            <div style={{
              position: 'absolute',
              top: `${MARGIN_TOP_MM}mm`,
              left: `${MARGIN_LEFT_MM}mm`,
              right: `${MARGIN_LEFT_MM}mm`,
              height: `${HEADER_HEIGHT_MM}mm`,
              overflow: 'hidden',
            }}>
              <div className="text-center">
                <h1 className="font-bold" style={{ color: '#000000', fontSize: '16pt', marginBottom: '0.5mm', lineHeight: '1.1' }}>
                  {event.name}
                </h1>
                <p style={{ fontSize: '11pt', marginBottom: '0.5mm', lineHeight: '1.1' }}>
                  Full Seating Chart - Total Guests: {guests.length}
                </p>
                {event.ceremony_date && (
                  <p style={{ color: '#000000', fontSize: '8pt', marginBottom: '0.5mm', lineHeight: '1.1' }}>
                    Ceremony: {formatDateWithOrdinal(event.ceremony_date)} | {event.ceremony_venue || 'Venue TBD'} | {formatTimeDisplay(event.ceremony_start_time)} – {formatTimeDisplay(event.ceremony_finish_time)}
                  </p>
                )}
                <p style={{ color: '#000000', fontSize: '8pt', marginBottom: '0', lineHeight: '1.1' }}>
                  Reception: {event.date && formatDateWithOrdinal(event.date)} | {event.venue || 'Venue TBD'} | {formatTimeDisplay(event.start_time)} – {formatTimeDisplay(event.finish_time)}
                </p>
                <div style={{ borderTop: '2px solid #000000', marginTop: '1.5mm' }}></div>
              </div>

              {/* Column Headers Bar */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  columnGap: `${COLUMN_GAP_MM}mm`,
                  backgroundColor: '#f3f3f3',
                  borderBottom: '2px solid #000000',
                  padding: '3px 2px',
                }}
              >
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-bold uppercase tracking-wide" style={{ fontSize: '8pt', color: '#000' }}>
                    Guests {paginationInfo.pages.slice(0, currentPage - 1).reduce((sum, p) => sum + p.guests.length, 0) + 1}-{paginationInfo.pages.slice(0, currentPage - 1).reduce((sum, p) => sum + p.guests.length, 0) + col1Guests.length}
                  </h3>
                  <h3 className="font-bold uppercase tracking-wide" style={{ fontSize: '8pt', color: '#000' }}>
                    Table
                  </h3>
                </div>
                {col2Guests.length > 0 && (
                  <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold uppercase tracking-wide" style={{ fontSize: '8pt', color: '#000' }}>
                      Guests {paginationInfo.pages.slice(0, currentPage - 1).reduce((sum, p) => sum + p.guests.length, 0) + col1Guests.length + 1}-{paginationInfo.pages.slice(0, currentPage - 1).reduce((sum, p) => sum + p.guests.length, 0) + currentGuests.length}
                    </h3>
                    <h3 className="font-bold uppercase tracking-wide" style={{ fontSize: '8pt', color: '#000' }}>
                      Table
                    </h3>
                  </div>
                )}
              </div>
            </div>

            {/* ── ZONE 2: CONTENT (fixed position & height — 25 rows × 9mm) ── */}
            <div style={{
              position: 'absolute',
              top: `${CONTENT_START_MM}mm`,
              left: `${MARGIN_LEFT_MM}mm`,
              right: `${MARGIN_LEFT_MM}mm`,
              height: `${CONTENT_HEIGHT_MM}mm`,
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: `${COLUMN_GAP_MM}mm`,
            }}>
              {/* Left Column */}
              <div style={{ overflow: 'hidden' }}>
                {settings.showGuestList && col1Guests.map((guest) => (
                  <ScreenGuestRow key={guest.id} guest={guest} />
                ))}
              </div>
              {/* Right Column */}
              <div style={{ overflow: 'hidden' }}>
                {settings.showGuestList && col2Guests.map((guest) => (
                  <ScreenGuestRow key={guest.id} guest={guest} />
                ))}
              </div>
            </div>

            {/* ── ZONE 3: FOOTER (anchored to bottom printable area — master template parity) ── */}
            <div style={{
              position: 'absolute',
              left: '12.7mm',
              right: '12.7mm',
              bottom: '10mm',
              minHeight: '12mm',
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              color: '#000',
              fontSize: '8pt',
              lineHeight: 1,
            }}>
              <div data-footer-generated="true" style={{ justifySelf: 'start', whiteSpace: 'nowrap' }}>Generated: {formatGeneratedTimestamp()}</div>
              {settings.showLogo
                ? <img src="/wedding-waitress-logo-brown.png?v=2" alt="Wedding Waitress" style={{ width: '36mm', height: '10mm', objectFit: 'contain' }} />
                : <div style={{ width: '36mm', height: '10mm' }} />}
              <div data-footer-page-number="true" style={{ justifySelf: 'end', whiteSpace: 'nowrap' }}>Page {currentPage} of {totalPages}</div>
            </div>

              </div>
            </div>
          </div>
        </div>

        {/* Bottom Page Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              className="border border-[#472c1d] text-[#472c1d]"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" strokeWidth={1.8} aria-hidden="true" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border border-[#472c1d] text-[#472c1d]"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" strokeWidth={1.8} aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {/* Print Version - Multi-page with proper pagination */}
      <div id="full-seating-print-content" className="hidden print:block">
        {paginationInfo.pages.map((pageInfo, pageIndex) => (
          <div 
            key={pageIndex}
            className="print-page"
            style={{ pageBreakAfter: pageIndex < paginationInfo.pages.length - 1 ? 'always' : 'auto' }}
          >
            <div className="print-header">
              <h1 className="print-event-name">{event.name}</h1>
              <p className="print-chart-subtitle">Full Seating Chart - Total Guests: {guests.length}</p>
              {event.ceremony_date && (
                <p className="print-detail-line">
                  Ceremony: {formatDateWithOrdinal(event.ceremony_date)} | {event.ceremony_venue || 'Venue TBD'} | {formatTimeDisplay(event.ceremony_start_time)} – {formatTimeDisplay(event.ceremony_finish_time)}
                </p>
              )}
              <p className="print-detail-line">
                Reception: {event.date && formatDateWithOrdinal(event.date)} | {event.venue || 'Venue TBD'} | {formatTimeDisplay(event.start_time)} – {formatTimeDisplay(event.finish_time)}
              </p>
              <div className="print-divider"></div>
            </div>
            
            {/* Column Headers Bar */}
            <div className="print-column-header-bar">
              <div className="print-column-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>GUESTS {pageInfo.startIndex + 1}-{pageInfo.startIndex + pageInfo.col1Count}</span>
                <span>TABLE</span>
              </div>
              {pageInfo.guests.length > pageInfo.col1Count && (
                <div className="print-column-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>GUESTS {pageInfo.startIndex + pageInfo.col1Count + 1}-{pageInfo.endIndex}</span>
                  <span>TABLE</span>
                </div>
              )}
            </div>
            
            <div className="print-guest-list">
              <div className="print-guest-column">
                {settings.showGuestList && pageInfo.guests.slice(0, pageInfo.col1Count).map((guest) => (
                  <PrintGuestRow key={guest.id} guest={guest} />
                ))}
              </div>
              <div className="print-guest-column">
                {settings.showGuestList && pageInfo.guests.length > pageInfo.col1Count && (
                  <>
                    {pageInfo.guests.slice(pageInfo.col1Count).map((guest) => (
                      <PrintGuestRow key={guest.id} guest={guest} />
                    ))}
                  </>
                )}
              </div>
            </div>
            
            {/* Print Footer */}
            <div className="print-footer-section">
              <div data-footer-generated="true" style={{ justifySelf: 'start', whiteSpace: 'nowrap' }}>Generated: {formatGeneratedTimestamp()}</div>
              {settings.showLogo
                ? <img src="/wedding-waitress-logo-brown.png?v=2" alt="Wedding Waitress" />
                : <div style={{ width: '36mm', height: '10mm' }} />}
              <div data-footer-page-number="true" style={{ justifySelf: 'end', whiteSpace: 'nowrap' }}>Page {pageIndex + 1} of {paginationInfo.pages.length}</div>
            </div>
            
          </div>
        ))}
      </div>
    </>
  );
};
