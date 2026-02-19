

# Rearrange Guest Lookup Search Card Header

Based on the screenshot and your instructions, here are the three changes to `src/pages/GuestLookup.tsx`:

## 1. Rewrite the card header text

**Current (lines 602-610):**
- Line 1 (bold title): "Update & Confirm Your Details"
- Line 2 (subtitle): "Type your full name & update your info"
- Line 3 (hint): "Type at least 2 letters of your name to search"

**New layout:**
- Line 1 (bold title): "Type Your Full Name Here"
- Line 2 (bold title, same size): "Update & Confirm Your Details"
- Remove the subtitle and the "2 letters" hint entirely from the header

## 2. Move "Last updated" line down

Move the "Last updated / Refresh" block (lines 664-675) from its current position to directly above the "Having trouble finding your name?" footer (line 678).

## 3. No other changes

The person icon was already removed in the previous edit. The search input and results remain unchanged.

### Technical Detail

**File:** `src/pages/GuestLookup.tsx`

- **Lines 602-610**: Replace the `CardTitle`, `CardDescription`, and hint `<p>` with two `CardTitle` lines -- "Type Your Full Name Here" and "Update & Confirm Your Details". Remove the `CardDescription` and hint text.
- **Lines 662-675**: Remove the `Separator` and "Last updated" block from their current position.
- **Lines 677-681**: Insert the "Last updated" block just before the "Having trouble finding your name?" section.

