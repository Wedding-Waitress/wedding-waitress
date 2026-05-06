/**
 * Shared PDF export utilities for stable, Acrobat / printer-friendly output.
 *
 * Goals:
 *  - Reduce UI thread blocking during export (yield to event loop).
 *  - Produce smaller, more compatible PDFs (compression + subset fonts).
 *  - Use async Blob download instead of jsPDF's synchronous `save()` which
 *    can lock the main thread on large documents and cause Acrobat /
 *    printer queue instability.
 *
 * NOTE: This file does NOT change any visual layout, fonts, spacing,
 * headers, footers or page sizing. It only affects how the PDF binary is
 * configured and delivered to the browser.
 */

import type jsPDF from 'jspdf';

/**
 * Recommended jsPDF constructor options for all A4 exports.
 * Spread into existing `new jsPDF({ ... })` calls.
 *
 *  - compress: shrinks output stream → faster open in Acrobat, smaller print spool
 *  - putOnlyUsedFonts: avoids embedding the entire helvetica metric table
 *  - precision: caps numeric precision in the PDF stream (default 16 → 2)
 */
export const PDF_DEFAULT_OPTIONS = {
  compress: true,
  putOnlyUsedFonts: true,
  precision: 2,
} as const;

/**
 * Yield to the browser so the UI can repaint between heavy synchronous
 * draw loops. Cheap and safe to call multiple times.
 */
export const yieldToBrowser = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      window.requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });

/**
 * Save a jsPDF document as a Blob download. This is more stable than
 * `pdf.save()` because:
 *
 *  - The Blob is created off the main render path.
 *  - The browser handles the download via an <a> click, which is well
 *    supported by Acrobat / Windows print spoolers.
 *  - We `await` blob creation so callers can sequence cleanly without
 *    re-triggering exports.
 */
export const savePdfAsync = async (pdf: jsPDF, fileName: string): Promise<void> => {
  // Yield once so any pending UI work (toast, button state, etc.) paints first.
  await yieldToBrowser();

  let blob: Blob;
  try {
    blob = pdf.output('blob');
  } catch (err) {
    // Fallback to native save if blob output is unavailable for any reason.
    console.warn('[pdfExportUtils] blob output failed, falling back to pdf.save()', err);
    pdf.save(fileName);
    return;
  }

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    // Defer revoke so the download has time to start in all browsers.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Yield again so the caller's UI can resume immediately.
  await yieldToBrowser();
};
