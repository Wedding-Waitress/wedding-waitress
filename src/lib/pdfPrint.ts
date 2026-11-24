/** Open synchronously in the click handler, before PDF generation can consume
 * the browser's popup permission. Print the existing PDF, never the dashboard. */
export interface PdfPrintJob {
  print: (blob: Blob, isCurrent?: () => boolean) => Promise<void>;
  close: () => void;
}

export function openPdfPrintWindow(): PdfPrintJob {
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Please allow popups for this site to open the print preview.');
  preview.opener = null;
  preview.document.title = 'Wedding Waitress Print Preview';
  preview.document.body.textContent = 'Preparing your print preview…';
  const close = () => { if (!preview.closed) preview.close(); };
  return createPdfPrintJob(preview, close, () => preview.closed);
}

/** Keep PDF preparation in the active application and print only its prepared
 * pages. No blank popup, focus handoff, dashboard CSS, or remote resources. */
export function openPdfPrintFrame(): PdfPrintJob {
  const frame = document.createElement('iframe');
  frame.title = 'Wedding Waitress print document';
  frame.dataset.pdfPrintFrame = '';
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none';
  document.body.append(frame);
  return createPdfPrintJob(frame.contentWindow!, () => frame.remove(), () => !frame.isConnected, true);
}

function createPdfPrintJob(preview: Window, close: () => void, isClosed: () => boolean, waitForDialog = false): PdfPrintJob {
  return {
    close,
    async print(blob, isCurrent = () => true) {
      const check = () => {
        if (isClosed()) throw new Error('The print preview was closed.');
        if (!isCurrent()) throw new Error('The selected event or document changed. Please print again.');
      };
      check();
      const [{ getDocument }] = await Promise.all([import('pdfjs-dist'), import('./pdfFirstPageToPng')]);
      const pdf = await getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
      try {
        const doc = preview.document;
        const style = doc.createElement('style');
        style.textContent = 'html,body{margin:0;padding:0;background:#fff}section{break-after:page;page-break-after:always;overflow:hidden}section:last-child{break-after:auto;page-break-after:auto}img{display:block;width:100%;height:100%}@media screen{body{background:#ddd}section{margin:12px auto;box-shadow:0 2px 8px #0003}}';
        doc.head.append(style);
        doc.body.replaceChildren();
        for (let index = 1; index <= pdf.numPages; index++) {
          check();
          const page = await pdf.getPage(index);
          const size = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: 3 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Unable to prepare the print preview.');
          // Display rendering waits for the opener's animation frames, which
          // Chrome throttles when a popup has focus. Print rendering does not.
          await page.render({ canvas, canvasContext: context, viewport, intent: 'print' }).promise;
          check();
          const width = size.width * 25.4 / 72;
          const height = size.height * 25.4 / 72;
          const paper = doc.createElement('section');
          paper.style.width = `${width}mm`;
          paper.style.height = `${height}mm`;
          const image = doc.createElement('img');
          image.alt = `Page ${index} of ${pdf.numPages}`;
          image.src = canvas.toDataURL('image/png');
          paper.append(image);
          doc.body.append(paper);
          await image.decode();
          if (index === 1) style.textContent += `@page{size:${width}mm ${height}mm;margin:0}`;
          page.cleanup();
          canvas.width = canvas.height = 0;
        }
        check();
        if (waitForDialog) {
          await new Promise<void>((resolve, reject) => {
            const done = () => { preview.removeEventListener('afterprint', done); close(); resolve(); };
            preview.addEventListener('afterprint', done, { once: true });
            try { preview.print(); }
            catch (error) { preview.removeEventListener('afterprint', done); close(); reject(error); }
          });
        } else {
          preview.addEventListener('afterprint', close, { once: true });
          preview.focus();
          preview.print();
        }
      } finally {
        await pdf.destroy();
      }
    },
  };
}
