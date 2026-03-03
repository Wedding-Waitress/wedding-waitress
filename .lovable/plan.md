

## Fix: Manual numeric inputs not working in Text Position tab

**Problem:** The `onChange` handler uses `parseFloat(e.target.value) || 0` which immediately converts partial input (like `-`, empty string, or `-4.`) to `0`, preventing users from typing values manually.

**Solution:** Convert the four inputs to use string-based local state for free typing, then parse/clamp/persist only on blur or Enter.

### File: `src/components/Dashboard/PlaceCards/PlaceCardCustomizer.tsx`

1. Add four string states for the input fields:
   - `inputGuestX`, `inputGuestY`, `inputTableX`, `inputTableY` (strings)

2. Sync string states from numeric states (in useEffect or when slider changes):
   - When `localGuestNameOffsetX` changes (from slider), set `inputGuestX = String(localGuestNameOffsetX)`

3. Change each Input's `value` to use the string state and `onChange` to just set the string directly (no parsing):
   - `value={inputGuestX}` / `onChange={(e) => setInputGuestX(e.target.value)}`

4. On `onBlur` and `onKeyDown` Enter: parse the string, clamp, update both numeric local state and persist to Supabase.

This applies to all four inputs (Guest Name X/Y, Table X/Y). No other changes.

