

## Fix Font Dropdown Rendering — Preload on Scroll, Not Hover

### Problem
The `PlaceCardFontPicker` only preloads 15 fonts per category on open. Remaining fonts load on hover via `onMouseEnter`, so they initially render in the fallback system font until hovered.

### Solution
Replace the hover-based loading with an `IntersectionObserver` pattern that loads each font's CSS as its `CommandItem` scrolls into view within the `CommandList`. This ensures every visible font renders in its true typeface immediately — no hover needed.

### Changes — `src/components/Dashboard/PlaceCards/PlaceCardFontPicker.tsx`

1. **Create a `FontItem` wrapper component** that uses a `useRef` + `IntersectionObserver` to call `loadPreviewFont(name)` as soon as the item enters the viewport of the scrollable list. Once loaded, disconnect the observer.

2. **Remove `onMouseEnter={() => loadPreviewFont(font.name)}`** from line 154 — no longer needed.

3. **Remove the `loadVisibleFonts` callback and its `useEffect`** (lines 70-83) — the observer handles all loading automatically.

4. **Keep the selected-font preload** (lines 63-67) so the trigger button always renders correctly.

### FontItem sketch
```tsx
const FontItem: React.FC<{name: string; selected: boolean; onSelect: () => void}> = ({name, selected, onSelect}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        loadPreviewFont(name);
        obs.disconnect();
      }
    }, { rootMargin: '100px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [name]);

  return (
    <CommandItem ref={ref} value={name} onSelect={onSelect}>
      <Check className={cn('mr-2 h-3.5 w-3.5', selected ? 'opacity-100' : 'opacity-0')} />
      <span style={{ fontFamily: name }} className="text-sm">{name}</span>
    </CommandItem>
  );
};
```

### Files modified
- `src/components/Dashboard/PlaceCards/PlaceCardFontPicker.tsx` only

