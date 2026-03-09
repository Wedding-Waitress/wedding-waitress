

## Plan: Update Guest Lookup Search Section

### Changes (all in `src/pages/GuestLookup.tsx`)

1. **Remove "Type Your Full Name Here" heading** (lines 685-692): Delete the two `CardTitle` lines ("Type Your Full Name Here" and "Update & Confirm Your Details").

2. **Update search input placeholder** (line 699): Change the fallback placeholder from `"Type your first or last name..."` to `"Type your full name here..."`.

3. **Move content up**: Remove `CardHeader` entirely since the titles are gone. Reduce top spacing — remove `mt-4` on the search input div (line 695) and tighten `space-y` gaps.

4. **Tighten bottom section**: Remove `-mt-4` on the help text div (line 758), reduce `mt-4` on the Share button div (line 764) to bring everything closer together.

5. **Update Share button**: Change text from "Share" to "Share this invite". Match font size to the help text (`text-sm` instead of `text-[10px]`), adjust height/padding accordingly.

