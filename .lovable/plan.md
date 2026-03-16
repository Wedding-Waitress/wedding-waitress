

## Fix: Instant Canvas Updates with Debounced Persistence

**Problem**: The 300ms debounce delays the canvas update. But removing it entirely causes lag because `updateSettings` awaits a Supabase round-trip before updating local state.

**Solution**: Move the debounce from the input to the persistence layer. The canvas updates instantly via optimistic local state; Supabase saves are batched with a 300ms debounce.

### Changes

**1. `src/hooks/useInvitationCardSettings.ts`** — Split `updateSettings` into optimistic + debounced save:
- Add a `useRef` for the debounce timer
- Immediately update `artworks` state (optimistic) so the canvas reflects changes instantly
- Debounce the actual Supabase `.update()` call by 300ms
- Cleanup timer on unmount

**2. `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`** — Revert to plain `Input`:
- Remove the `DebouncedTextInput` component entirely
- Replace the `<DebouncedTextInput>` usage back to a standard `<Input>` with direct `onChange` calling `updateZone`

**Result**: Every keystroke instantly updates local state → canvas re-renders immediately. Supabase save only fires 300ms after the user stops typing. No lag, no data loss.

