

# Rearrange Guest Lookup Search Section

Three layout changes to the public guest lookup page (the QR code destination):

## Changes

### 1. Move "Type at least 2 letters..." hint up
Currently this text appears below the search box with a person icon. It will be moved directly under the subtitle "Type your full name & update your info", so guests see the instruction before they start typing.

### 2. Move "Last updated" line above "Having trouble finding your name?"
The timestamp and Refresh button currently sit in the card header area. It will be relocated just above the "Having trouble finding your name?" footer section, keeping it visible but out of the primary flow.

### 3. Remove the person icon
The large human silhouette icon between the search box and the hint text will be removed.

---

## Technical Details

**File: `src/pages/GuestLookup.tsx`**

- **Lines 606-607**: Add the "Type at least 2 letters" hint text as a static line right after the CardDescription subtitle.
- **Lines 608-618**: Remove the "Last updated" block from the card header.
- **Lines 635-641**: Remove the entire conditional block (icon + hint text) that currently shows when search term is under 2 characters.
- **Lines 678-684**: Insert the "Last updated" line (timestamp + Refresh button) just above the "Having trouble finding your name?" section.

