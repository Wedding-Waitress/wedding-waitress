

# Create Event Modal - Event Name Field Updates

## Changes

### 1. Reduce event name field width by 25%
**File:** `src/components/Dashboard/EventCreateModal.tsx` (line 257)

Change `<div className="flex-1">` to `<div className="flex-1 max-w-[75%]">` -- matching the Edit Event modal.

### 2. Change event name border from purple to green when empty
**File:** `src/components/Dashboard/EventCreateModal.tsx` (line 262)

Override the event name input's border to always use green instead of purple. Add explicit green border classes to the input so it matches the Edit Event field style:

Change the className to always apply `border-green-500 focus-visible:border-green-500` regardless of whether the field is empty or filled, specifically for the event name input only (other fields throughout the form keep their purple-when-empty / green-when-filled behavior).

