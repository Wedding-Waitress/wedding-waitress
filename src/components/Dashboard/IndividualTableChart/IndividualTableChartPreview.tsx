/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 *
 * This Individual Table Charts feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 *
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated A4 export system,
 * seat positioning algorithms, and multi-table PDF generation.
 *
 * Last completed: 2025-10-04
 */

import React, { useEffect, useRef, useState } from 'react';
import { Guest } from '@/hooks/useGuests';
import { TableWithGuestCount } from '@/hooks/useTables';
import { IndividualChartSettings } from './IndividualTableSeatingChartPage';
import { IndividualTableChartPrintPage } from './IndividualTableChartPrintPage';
import { A4_PAGE_STYLE, A4_PX } from '@/lib/a4';

interface IndividualTableChartPreviewProps {
  settings: IndividualChartSettings;
  table: TableWithGuestCount;
  guests: Guest[];
  event: any;
  totalTables?: number;
  currentTableIndex?: number;
}

export const IndividualTableChartPreview: React.FC<IndividualTableChartPreviewProps> = ({
  settings,
  table,
  guests,
  event,
  totalTables = 1,
  currentTableIndex = 1,
}) => {
  const tabletWrapperRef = useRef<HTMLDivElement>(null);
  const [tabletScale, setTabletScale] = useState(1);

  useEffect(() => {
    const compute = () => {
      const availableWidth = tabletWrapperRef.current?.clientWidth ?? window.innerWidth;
      setTabletScale(Math.min(1, availableWidth / A4_PX.width));
    };

    compute();
    window.addEventListener('resize', compute);

    let ro: ResizeObserver | undefined;
    if (tabletWrapperRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(compute);
      ro.observe(tabletWrapperRef.current);
    }

    return () => {
      window.removeEventListener('resize', compute);
      ro?.disconnect();
    };
  }, []);

  return (
    <div className="flex justify-center">
      <div
        ref={tabletWrapperRef}
        className="w-full"
        style={
          tabletScale < 1
            ? { height: `${A4_PX.height * tabletScale}px`, overflow: 'hidden', display: 'flex', justifyContent: 'center', width: '100%' }
            : undefined
        }
      >
        <div
          style={
            tabletScale < 1
              ? { transform: `scale(${tabletScale})`, transformOrigin: 'top center', width: A4_PAGE_STYLE.width, margin: '0 auto' }
              : undefined
          }
        >
          <div
            id="printA4-individual-table"
            className="overflow-hidden mx-auto"
            style={{
              ...A4_PAGE_STYLE,
              minWidth: A4_PAGE_STYLE.width,
              maxWidth: A4_PAGE_STYLE.width,
              minHeight: A4_PAGE_STYLE.height,
              boxSizing: 'border-box',
            }}
          >
            <IndividualTableChartPrintPage
              settings={settings}
              table={table}
              guests={guests}
              event={event}
              totalTables={totalTables}
              currentTableIndex={currentTableIndex}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
