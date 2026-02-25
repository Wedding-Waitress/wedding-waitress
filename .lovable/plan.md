
# Merge Feature Buttons and Tabs into One Unified Container

## Problem
Currently, the four feature buttons (View RSVP Invite, View Video, Floor Plan, View Menu) are in one white rounded container, and the two tabs (Update Your Details, Table View) are in a separate white container below, creating a visible gap/separation between them. The user wants all six items in one seamless white background area.

## Solution
Merge the two containers into a single white background container so all buttons appear unified, then reduce the gap between this combined section and the search card below.

## Technical Details

**File:** `src/pages/GuestLookup.tsx`

### Change 1: Remove the separate wrappers and combine into one container (lines 600-672)

- Remove the closing tags of the feature buttons container (lines 641-643)
- Remove the opening wrapper of the main content / tabs section (lines 646-650)
- Instead, place the feature buttons grid and the tabs list inside one shared white container with consistent padding
- The combined structure will be:
  ```
  <div className="w-full px-4 pt-4 pb-1">
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-2.5 rounded-xl border-2 border-gray-200 shadow-sm space-y-3">
        <!-- grid of 4 feature buttons -->
        <!-- grid of 2 tab triggers (Update Your Details / Table View) -->
      </div>
    </div>
  </div>
  ```
- Move the `TabsContent` and remaining search card outside this combined container, with a small gap (`pt-3`) above it

### Files Modified
1. `src/pages/GuestLookup.tsx` -- restructure the feature buttons + tabs into one unified container
