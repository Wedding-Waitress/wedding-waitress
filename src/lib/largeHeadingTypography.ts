/** Only interface headings opt in. Customer artwork and document renderers
 * retain their own typography, including when mounted inside a dialog. */
export const LARGE_HEADING_MARKER = 'data-ww-large-heading';
export const HEADING_EXCLUSIONS = [
  '[data-print-mirror-document]', '[data-print-mirror-presentation]',
  '[data-dashboard-artwork]', '[data-reception-room-canvas]',
  '[data-slideshow-preview-stage]', '[data-signage-fit-preview]',
  '[data-a4-preview-page]', '[data-dietary-a4-preview]',
  '.ww-itc-preview', '.ww-placecards-preview', '.ww-invitations-preview',
  '.dietary-a4-preview', '#qr-preview', '[class*="previewStage"]',
  '[class*="previewCanvas"]', '[class*="previewSheet"]',
  '[class*="previewViewport"]', '[class*="boothCapturePreview"]',
  '[data-dashboard-profile-menu]', '[data-dashboard-sidebar]',
  '[data-sidebar="sidebar"]', '.ww-sidebar-background',
  'svg', 'canvas', 'iframe', '.sr-only', '[aria-hidden="true"]',
].join(',');

const CANDIDATES = 'h1,h2,h3,h4,h5,h6,[role="heading"],[data-ww-heading],[data-ww-paper-size],.ww-signage-guidelines-title,[data-export-controls-heading],[class*="printSizeTitle"],[class*="sectionHeading"]';
const PORTALS = '[role="dialog"],[role="alertdialog"],[data-radix-popper-content-wrapper]';

export function updateLargeHeadings(scope: ParentNode = document.body) {
  if (scope instanceof HTMLElement && scope.hasAttribute(LARGE_HEADING_MARKER) && !scope.matches(CANDIDATES)) {
    scope.removeAttribute(LARGE_HEADING_MARKER);
  }
  const headings = Array.from(scope.querySelectorAll<HTMLElement>(CANDIDATES));
  if (scope instanceof HTMLElement && scope.matches(CANDIDATES)) headings.unshift(scope);
  for (const heading of headings) {
    if (heading.closest(HEADING_EXCLUSIONS)) continue;
    if (!heading.closest('#root') && !heading.closest(PORTALS)) continue;
    const printSize = heading.matches('[data-ww-paper-size],[class*="printSizeTitle"]');
    if (!printSize && heading.closest('button,a,[role="button"]')) continue;
    // Editable titles can render their entire wording as a button. Those are
    // controls, whose existing label typography the owner asked to preserve.
    if (heading.querySelector('button,a,[role="button"],input,select,textarea')) continue;
    if (heading.hasAttribute(LARGE_HEADING_MARKER)) {
      const requested = heading.getAttribute('data-ww-heading');
      if (printSize) heading.setAttribute(LARGE_HEADING_MARKER, 'main');
      else if (requested === 'main' || requested === 'workspace' || requested === 'control') heading.setAttribute(LARGE_HEADING_MARKER, requested);
      continue;
    }
    const size = parseFloat(getComputedStyle(heading).fontSize);
    let category: string | undefined;
    if (heading.closest('.ww-public') && !heading.closest(PORTALS)) {
      if (heading.matches('h1.ww-display')) category = 'hero';
      else if (heading.matches('.ww-title') || (size >= 30 && heading.matches('h1,h2'))
        || (heading.matches('h2') && /(?:^|\s)(?:\w+:)*text-(?:3xl|4xl|5xl|6xl)(?:\s|$)/.test(heading.className))) category = 'section';
    } else if (heading.hasAttribute('data-export-controls-heading')) category = 'control';
    else if (heading.getAttribute('data-ww-heading') === 'workspace') category = 'workspace';
    else if (heading.getAttribute('data-ww-heading') === 'control') category = 'control';
    else if (printSize || heading.getAttribute('data-ww-heading') === 'main') category = 'main';
    else if (heading.matches('[role="dialog"] h2,[role="alertdialog"] h2') && size >= 18) category = 'main';
    else if (heading.matches('h1') && size < 20) category = 'control';
    else if (size >= 20) category = size >= 24 || heading.matches('h1') ? 'main' : 'compact';
    if (category) heading.setAttribute(LARGE_HEADING_MARKER, category);
  }
}

/** Catch lazy routes, guided steps and portalled panels as they mount. */
export function startLargeHeadingTypography() {
  let frame = 0;
  const pending = new Set<ParentNode>();
  const flush = () => {
    frame = 0;
    pending.forEach(updateLargeHeadings);
    pending.clear();
  };
  const schedule = (scope: ParentNode = document.body) => {
    pending.add(scope);
    if (!frame) frame = requestAnimationFrame(flush);
  };
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') schedule(record.target as Element);
      else record.addedNodes.forEach(node => { if (node instanceof Element) schedule(node); });
    }
  });
  updateLargeHeadings();
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'data-ww-heading'] });
  const refresh = () => schedule();
  window.addEventListener('resize', refresh);
  void document.fonts?.ready.then(refresh);
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', refresh);
    if (frame) cancelAnimationFrame(frame);
  };
}
