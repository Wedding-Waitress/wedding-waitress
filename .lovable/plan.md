

## Change Zone Heading Text Color to Dark Purple

**Task**: Make the zone heading text (e.g., "You Are Invited", "Event Name", "Custom Text 1") dark purple (#7248E6) to match the Wedding Waitress brand color.

**Change in `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`:**

Line 318 - Zone heading label:
```tsx
<span className="text-sm font-medium text-[#7248E6]">{zone.label}</span>
```

Single line change that adds `text-[#7248E6]` to the existing `text-sm font-medium` classes.

