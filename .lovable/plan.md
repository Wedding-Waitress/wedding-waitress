

## Add Purple Pill Border to Zone Headings

**What**: Add a rounded tablet/pill-shaped border around each zone heading (You Are Invited, Event Name, Event Date, etc.) in the dark Wedding Waitress purple (#7248E6), keeping the font size unchanged.

**Change in `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`:**

Line 318 - Wrap the zone label span in a bordered pill container:
```tsx
<span className="text-sm font-medium text-[#7248E6] border border-[#7248E6] rounded-full px-3 py-1">{zone.label}</span>
```

This adds:
- `border border-[#7248E6]` - dark purple border
- `rounded-full` - pill/tablet shape
- `px-3 py-1` - horizontal and vertical padding for the pill effect

The font size remains unchanged at `text-sm`, and the text color stays purple as previously set.

