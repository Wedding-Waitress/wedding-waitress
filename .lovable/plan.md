

## Fix: "Download All Pages PDF" Fails with "wrong PNG signature"

### Root Cause

The visible preview only renders **one page at a time** with `data-page={currentPage - 1}`. The "all pages" section exists but is hidden (`class="hidden print:block"`). When `exportAllPlaceCardsToPdf` loops through pages and calls `document.querySelector('[data-page="1"]')`, it finds the hidden print div. Since it has `display: none`, `html2canvas` produces invalid/empty output, causing jsPDF's PNG decoder to fail with "wrong PNG signature".

### Fix

Modify `exportAllPlaceCardsToPdf` in `src/lib/placeCardsPdfExporter.ts` to temporarily unhide the print container before capturing, then re-hide it after. The approach:

1. Find the print container (parent of the hidden `data-page` elements — the `div.hidden.print\\:block`)
2. Temporarily set it to `display: block` and position it offscreen (`position: absolute; left: -9999px`)
3. Capture each page with `html2canvas`
4. Restore the container to hidden

**Single file change: `src/lib/placeCardsPdfExporter.ts`**

Update `exportAllPlaceCardsToPdf` to:
```ts
// Find and temporarily show the print container
const printContainer = document.querySelector('.hidden.print\\:block') as HTMLElement;
if (printContainer) {
  printContainer.style.display = 'block';
  printContainer.style.position = 'absolute';
  printContainer.style.left = '-9999px';
  printContainer.style.top = '0';
}

try {
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    if (pageIndex > 0) pdf.addPage();
    const imageData = await convertPlaceCardPageToImage(pageIndex);
    pdf.addImage(imageData, 'PNG', 0, 0, 210, 297);
  }
  pdf.save(fileName);
} finally {
  // Restore hidden state
  if (printContainer) {
    printContainer.style.display = '';
    printContainer.style.position = '';
    printContainer.style.left = '';
    printContainer.style.top = '';
  }
}
```

This ensures all page elements are rendered and capturable by `html2canvas` during export, without affecting the visible UI.

