
# Fix Close Button Styling on Guest Live View Modals

## Problem
The close buttons (X) on the four Guest Live View modals (RSVP Invite, Welcome Video, Floor Plan, Wedding Menu) have inconsistent styling -- some show a small X in a square outline, others look different. They need to be unified as a **white circle with a larger X centered inside**.

## Solution
Update the `[&>button]` CSS selector on all four `DialogContent` components in `GuestLookup.tsx` to style the built-in Radix close button as a round circle with a prominent white X.

## Technical Details

**File:** `src/pages/GuestLookup.tsx`

For all four modals (lines 882, 922, 961, 999), update the `DialogContent` className to add these styles targeting the close button:

```
[&>button]:rounded-full
[&>button]:border-2
[&>button]:border-white
[&>button]:w-10
[&>button]:h-10
[&>button]:flex
[&>button]:items-center
[&>button]:justify-center
[&>button]:opacity-100
[&>button]:text-white
[&>button:hover]:text-white/80
[&>button:hover]:border-white/80
```

And increase the X icon size inside the button:

```
[&>button>svg]:w-6
[&>button>svg]:h-6
```

This gives each modal's close button a consistent look: a 40px white-bordered circle containing a large centered X icon, all in white.

### Files Modified
1. `src/pages/GuestLookup.tsx` -- update className on 4 DialogContent elements (lines 882, 922, 961, 999)
