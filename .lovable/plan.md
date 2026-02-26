

# Restyle Edit Button & Slim Down Share Button

## Changes

### 1. Edit Button -- Change from circle to pill/tablet shape with icon (`EnhancedGuestCard.tsx`)

**Current** (line 186-192): A large 56x56px purple circle with just "Edit" text.

**New**: A rounded-full pill button matching the Share button style, with a `Pencil` icon on the left and "Edit" text. Use `rounded-full px-5 py-1.5 h-auto text-sm font-semibold` (same as Share button).

- Import `Pencil` from `lucide-react`
- Replace the circle button with: `<Button onClick={...} className="ml-2 rounded-full px-5 py-1.5 h-auto bg-primary text-white hover:bg-primary/90 text-sm font-semibold"><Pencil className="w-4 h-4 mr-1.5" />Edit</Button>`

### 2. Share Button -- Reduce height (`GuestLookup.tsx`, line 770)

The Share button already uses `py-1.5` which should be compact. Looking at the screenshot, it appears taller than expected. Will ensure it uses `py-1` instead of `py-1.5` for a slimmer profile.

### Files
- `src/components/GuestLookup/EnhancedGuestCard.tsx` -- Edit button restyled
- `src/pages/GuestLookup.tsx` -- Share button height reduced
