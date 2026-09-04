export const MANROPE_14_MEDIUM_MARKER = "data-ww-manrope-14-medium";

const APP_PORTAL_SELECTOR = [
  "[data-radix-popper-content-wrapper]",
  '[role="dialog"][data-state]',
  '[role="alertdialog"][data-state]',
  '[role="menu"][data-state]',
  '[role="listbox"][data-state]',
  '[role="tooltip"][data-state]',
  "[data-sonner-toaster]",
  "[data-radix-toast-viewport]",
].join(",");

const FORM_CONTROLS_WITH_RENDERED_TEXT = new Set([
  "BUTTON",
  "INPUT",
  "OPTION",
  "SELECT",
  "TEXTAREA",
]);

const hasRenderedText = (element: Element) =>
  FORM_CONTROLS_WITH_RENDERED_TEXT.has(element.tagName) ||
  Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  );

const isAppOwned = (element: Element) => {
  const appRoot = document.getElementById("root");
  return Boolean(appRoot?.contains(element) || element.closest(APP_PORTAL_SELECTOR));
};

const primaryFontFamily = (fontFamily: string) =>
  fontFamily.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "").toLowerCase();

const isComputed14px = (fontSize: string) => {
  if (fontSize === "14px") return true;
  if (!fontSize.endsWith("rem")) return false;

  const rootFontSize = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize,
  );
  return Number.parseFloat(fontSize) * (rootFontSize || 16) === 14;
};

export const isManrope14Regular = (style: CSSStyleDeclaration) =>
  primaryFontFamily(style.fontFamily) === "manrope" &&
  style.fontStyle === "normal" &&
  isComputed14px(style.fontSize) &&
  style.fontWeight === "400";

const elementQualifies = (element: Element) =>
  isAppOwned(element) &&
  hasRenderedText(element) &&
  isManrope14Regular(window.getComputedStyle(element));

export const normalizeAppOwnedTypography = (scope: ParentNode = document.body) => {
  const effectiveScope =
    scope instanceof Element
      ? scope.closest(`[${MANROPE_14_MEDIUM_MARKER}]`) ?? scope
      : scope;
  const candidates: Element[] = [];
  if (effectiveScope instanceof Element) candidates.push(effectiveScope);
  candidates.push(...Array.from(effectiveScope.querySelectorAll("*")));

  const transitionSnapshots = new Map<
    HTMLElement | SVGElement,
    { hadStyleAttribute: boolean; value: string; priority: string }
  >();
  const disableTransition = (element: Element) => {
    if (
      !(element instanceof HTMLElement || element instanceof SVGElement) ||
      transitionSnapshots.has(element)
    ) {
      return;
    }
    transitionSnapshots.set(element, {
      hadStyleAttribute: element.hasAttribute("style"),
      value: element.style.getPropertyValue("transition"),
      priority: element.style.getPropertyPriority("transition"),
    });
    element.style.setProperty("transition", "none", "important");
  };

  const previouslyMarked = candidates.filter((element) =>
    element.hasAttribute(MANROPE_14_MEDIUM_MARKER),
  );
  previouslyMarked.forEach(disableTransition);
  previouslyMarked.forEach((element) =>
    element.removeAttribute(MANROPE_14_MEDIUM_MARKER),
  );
  const qualifying = candidates.filter(elementQualifies);
  qualifying.forEach(disableTransition);
  qualifying.forEach((element) =>
    element.setAttribute(MANROPE_14_MEDIUM_MARKER, ""),
  );
  qualifying.forEach((element) => void window.getComputedStyle(element).fontWeight);
  transitionSnapshots.forEach(({ hadStyleAttribute, value, priority }, element) => {
    if (value) {
      element.style.setProperty("transition", value, priority);
    } else {
      element.style.removeProperty("transition");
      if (!hadStyleAttribute && !element.getAttribute("style")) {
        element.removeAttribute("style");
      }
    }
  });

  return qualifying.length;
};

export const startAppOwnedTypographyNormalization = () => {
  let animationFrame = 0;
  let observer: MutationObserver;
  const pendingScopes = new Set<ParentNode>();

  const observe = () => {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style"],
      childList: true,
      characterData: true,
      subtree: true,
    });
  };

  const flush = () => {
    animationFrame = 0;
    observer.disconnect();
    pendingScopes.forEach((scope) => normalizeAppOwnedTypography(scope));
    pendingScopes.clear();
    observer.takeRecords();
    observe();
  };

  const schedule = (scope: ParentNode = document.body) => {
    pendingScopes.add(scope);
    if (!animationFrame) animationFrame = window.requestAnimationFrame(flush);
  };

  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const target =
        mutation.target.nodeType === Node.TEXT_NODE
          ? mutation.target.parentElement
          : mutation.target;
      if (target instanceof Element) schedule(target);
    });
  });

  normalizeAppOwnedTypography();
  observe();

  const refreshAll = () => schedule(document.body);
  window.addEventListener("resize", refreshAll);
  void document.fonts?.ready.then(refreshAll);

  return () => {
    observer.disconnect();
    window.removeEventListener("resize", refreshAll);
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
  };
};
