/**
 * WEDDING WAITRESS — NEW DASHBOARD PAGE TEMPLATE (GLOBAL RULE)
 *
 * Use this file as the starting scaffold for EVERY new dashboard page.
 * Any content area wider than the mobile viewport MUST be wrapped in
 * <PinchZoomContainer naturalWidth={...}> so pinch-to-zoom + pan works
 * on all touch-capable devices (touch PCs, tablets, phones).
 *
 * Touch detection rule:
 *   - Use navigator.maxTouchPoints > 0 (handled internally by PinchZoomContainer)
 *   - Do NOT gate by viewport breakpoints (sm/md/lg)
 *
 * Suggested naturalWidth values:
 *   - A4 preview / printable doc      → 794
 *   - Wide tables / multi-col forms   → 1100–1200
 *   - Standard cards / instructions   → 900–1000
 */
import React from 'react';
import { PinchZoomContainer } from '@/components/ui/PinchZoomContainer';

interface NewDashboardPageTemplateProps {
  title: string;
  subtitle?: string;
  /** Header / selectors / export controls — NOT zoom-wrapped */
  header?: React.ReactNode;
  /** Main content — automatically wrapped in PinchZoomContainer */
  children: React.ReactNode;
  /** Tune to the natural pixel width of your content. */
  contentNaturalWidth?: number;
}

export function NewDashboardPageTemplate({
  title,
  subtitle,
  header,
  children,
  contentNaturalWidth = 1100,
}: NewDashboardPageTemplateProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      {header}

      {/* GLOBAL RULE: every content area must live inside PinchZoomContainer */}
      <PinchZoomContainer naturalWidth={contentNaturalWidth}>
        {children}
      </PinchZoomContainer>
    </div>
  );
}
