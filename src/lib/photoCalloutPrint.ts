import { waitForPhotoCardLayout } from './photoCalloutReady';
import { createPhotoCalloutPrintFrame } from './photoCalloutPrintFrame';

/** Match Budget Print's isolated body-level print surface. The transient clone
 * is the exact authoritative document, without dashboard layout ancestors. */
export async function printPhotoCalloutDocument(root: HTMLElement, isCurrent = () => true) {
  root.dispatchEvent(new Event('photo-export-start'));
  let preview: Awaited<ReturnType<typeof createPhotoCalloutPrintFrame>> | undefined;
  try {
    await waitForPhotoCardLayout(root);
    if (!isCurrent()) throw new Error('The selected event or cards changed. Please print again.');
    if (!root.querySelector('[data-photo-sheet]')) throw new Error('No photo cards to print.');
    preview = await createPhotoCalloutPrintFrame(root);
    if (!isCurrent()) throw new Error('The selected event or cards changed. Please print again.');
    // Chrome can return from print() before its preview is finished. Keep the
    // pages and isolation stable until the dialog closes, including Cancel.
    await new Promise<void>((resolve, reject) => {
      const printWindow = preview!.printWindow;
      const done = () => { printWindow.removeEventListener('afterprint', done); resolve(); };
      printWindow.addEventListener('afterprint', done, { once: true });
      try { printWindow.print(); }
      catch (error) { printWindow.removeEventListener('afterprint', done); reject(error); }
    });
  } finally {
    preview?.close();
    root.dispatchEvent(new Event('photo-export-end'));
  }
}
