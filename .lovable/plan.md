## Goal

Create a reusable pinch-to-zoom system so any future page can opt into the same gesture behavior already shipped on the Dietary Requirements and Floor Plan pages. Nothing existing changes — this is a pure additive build.

## Files to create

### 1. `src/hooks/usePinchToZoom.ts`

Reusable hook encapsulating all gesture state.

**Signature**
```ts
interface UsePinchToZoomOptions {
  minScale?: number;          // default 0.5
  maxScale?: number;          // default 3.0
  initialScale?: number;      // default 1
  fitToContainer?: boolean;   // default false
  naturalWidth?: number;      // required when fitToContainer is true
}

interface UsePinchToZoomReturn {
  scale: number;
  translateX: number;
  translateY: number;
  fitScale: number;           // computed when fitToContainer; otherwise = initialScale
  isAnimating: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove:  (e: React.TouchEvent) => void;
    onTouchEnd:   (e: React.TouchEvent) => void;
  };
  reset: () => void;
}

function usePinchToZoom(
  containerRef: React.RefObject<HTMLElement>,
  options?: UsePinchToZoomOptions
): UsePinchToZoomReturn;
```

**Behavior**
- Pinch (2 fingers): adjust scale clamped to `[effectiveMin, maxScale]` where `effectiveMin = fitToContainer ? fitScale : minScale`.
- Single-finger drag: pans (`translateX/Y`) only when `scale > effectiveMin + 0.001`. Below that threshold, do not preventDefault so the page scrolls naturally.
- Double-tap (within 300ms): smoothly resets scale to `effectiveMin` and translate to `(0, 0)`, with `isAnimating = true` for one frame so consumers can apply `transition: transform 0.3s ease`.
- `reset()`: imperative version of double-tap.
- When `fitToContainer` is true: a `ResizeObserver` on `containerRef.current` recomputes `fitScale = min(1, containerWidth / naturalWidth)` on mount and resize, and updates `scale` to `fitScale` if the user hasn't manually zoomed (tracked with a `userInteracted` ref reset by `reset()`).
- All touch listeners are attached via the returned `handlers` object so the consumer controls which element receives them; the hook itself does not mutate the DOM.

### 2. `src/components/ui/PinchZoomContainer.tsx`

Thin wrapper around the hook for drop-in use.

**Props**
```ts
interface PinchZoomContainerProps {
  children: React.ReactNode;
  naturalWidth?: number;       // e.g. 794 for A4; enables fitToContainer when provided
  minScale?: number;           // default 0.5
  maxScale?: number;           // default 3.0
  initialScale?: number;       // default 1 (ignored when naturalWidth set)
  showHint?: boolean;          // default true
  className?: string;
}
```

**Implementation**
- Outer `div` with `ref={containerRef}`, `overflow: hidden`, `touch-action: pan-y` (so the page can still vertical-scroll when not zoomed), `position: relative`, plus `className`.
- Inner transform div: `transform: translate(tx, ty) scale(scale)`, `transformOrigin: 'top center'`, `transition: isAnimating ? 'transform 0.3s ease' : undefined`. Receives `handlers` from the hook.
- When `naturalWidth` is provided, inner uses `width: max-content; margin: 0 auto` so the natural-size content can be fit-scaled.
- Touch detection: detect once on mount via `'ontouchstart' in window || navigator.maxTouchPoints > 0`. Hint pill is rendered only when touch is detected and `showHint` is true.
- Hint markup: a pointer-events-none pill positioned absolutely at bottom-center, text `👌 Pinch to zoom · Drag to pan`, fades from `opacity: 1` to `0` after 3 seconds via a `setTimeout` and CSS transition (`transition-opacity duration-500`).
- Styling stays inside the component (no Tailwind config edits, no `index.css` edits).

## What is NOT touched

- `KitchenDietaryChart.tsx`, `PinchZoomA4Wrapper.tsx`, `FloorPlanPage.tsx`, `PinchZoomFloorPlan.tsx`, and every other page/component remain untouched.
- No memory or design tokens are modified.
- No tests, stories, or exports are added beyond the two new files.

## Acceptance

- `import { usePinchToZoom } from '@/hooks/usePinchToZoom'` and `import { PinchZoomContainer } from '@/components/ui/PinchZoomContainer'` both work.
- Build passes with no TypeScript errors.
- Existing Dietary Requirements and Floor Plan pinch-to-zoom behavior is byte-for-byte unchanged.
