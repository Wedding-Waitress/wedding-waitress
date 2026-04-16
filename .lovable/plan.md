

# Fix Mobile Dropdown Nav — Add `e.preventDefault()` to All `onSelect` Handlers

## Problem
The mobile dropdown links use `onSelect` with `setTimeout` + `scrollIntoView`, but are missing `e.preventDefault()`. Radix UI's default `onSelect` behavior still fires, interfering with the scroll on mobile.

## Fix
Add `e.preventDefault()` to every `onSelect` handler in the mobile dropdown. The current code already has `setTimeout` wrapping `scrollIntoView` — the only missing piece is the `e.preventDefault()` call.

## File: `src/components/Layout/Header.tsx`

**Lines 191-223** — Update 5 items (How it Works, productLinks map, Pricing, FAQ, Contact):

Change pattern from:
```tsx
onSelect={() => { setTimeout(() => { ... }, 100); }}
```
To:
```tsx
onSelect={(e) => { e.preventDefault(); setTimeout(() => { ... }, 100); }}
```

Specifically:
- **Line 193** (How it Works): add `(e)` param and `e.preventDefault();`
- **Line 201** (productLinks map): add `(e)` param and `e.preventDefault();`
- **Line 208** (Pricing): add `(e)` param and `e.preventDefault();`
- **Line 214** (FAQ): add `(e)` param and `e.preventDefault();`
- **Line 220** (Contact): add `(e)` param and `e.preventDefault();`

## What does NOT change
- Desktop navigation links
- Sign In / Sign Up items (already working)
- Layout, design, colors, text — nothing visual changes

