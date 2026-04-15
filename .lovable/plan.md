

# Plan: Premium Apple-Style Buttons for Live View Page

## Summary
Apply a premium Apple-style button treatment to the 5 buttons on the Guest Lookup (Live View) page only: **Update Your Details**, **Accept**, **Decline**, **Add Guest**, and **Share this invite**.

## What Changes

### 1. EnhancedGuestCard.tsx — 4 buttons
Apply inline styles to each button for the exact specs:
- **Height**: 36px, **Padding**: 8px 18px, **Border-radius**: 10px, **Font-weight**: 500
- **Shadow**: `0 1px 2px rgba(0,0,0,0.08)`
- **Transition**: `all 0.2s ease`
- **Subtle gradient overlay** (barely visible, Apple-style — e.g., a `linear-gradient` from slightly lighter to slightly darker of the existing color)
- **Hover**: darker background (5-8%), lift `translateY(-1px)`, shadow `0 4px 10px rgba(0,0,0,0.12)`
- **Active**: press down, softer shadow

Buttons affected:
- **Update Your Details** (green, line ~187)
- **Accept** (green/success, line ~271)
- **Decline** (red/destructive, line ~282)
- **Add Guest** (purple/primary, line ~294)

Implementation: Use a shared CSS class (e.g., `.lv-premium-btn`) defined in `index.css` scoped or applied only to these buttons, plus Tailwind overrides for the specific sizing.

### 2. GuestLookup.tsx — Share this invite button (line ~813)
Apply the same premium style to the "Share this invite" button.

### 3. index.css — Add premium button class
Add a `.lv-premium-btn` utility class with:
```css
.lv-premium-btn {
  height: 36px;
  padding: 8px 18px;
  border-radius: 10px;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
  transition: all 0.2s ease;
}
.lv-premium-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.12);
}
.lv-premium-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}
```

Each button keeps its existing color but gets a subtle gradient overlay (e.g., green button gets `linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(0,0,0,0.04))`).

## Files Modified
1. `src/index.css` — Add `.lv-premium-btn` class
2. `src/components/GuestLookup/EnhancedGuestCard.tsx` — Apply class to 4 buttons
3. `src/pages/GuestLookup.tsx` — Apply class to Share button

## What Does NOT Change
- No other pages affected
- All existing button colors preserved
- No changes to button functionality or locked features

