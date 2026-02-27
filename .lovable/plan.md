

# Fix: Auto-generate Text Zones and Improve Empty State UX

## Problem
When an admin uploads a new invitation template, no text zones are created automatically. Users then see a dead-end "No text zones configured" message in the customizer with no way forward.

## Solution

### 1. Auto-generate default text zones on template creation (Admin)
When the admin creates a new template in `AdminInvitationTemplates.tsx`, automatically populate `text_zones` based on the selected `card_type`:

- **Invitation** (7 zones): Couple Names, Date, Venue, Time, Dress Code, RSVP Details, Guest Name
- **Save The Date** (3 zones): Couple Names, Date, Venue
- **Thank You** (3 zones): Couple Names, Thank You Message, Guest Name

Each zone gets sensible default positioning (vertically distributed), font settings, and type (auto vs custom).

### 2. Improve the customizer empty state
In `InvitationCustomizer.tsx`, replace the plain "No text zones" message with a helpful callout explaining that text zones need to be configured in the Admin panel's Text Zones editor, so users understand what to do.

### 3. Backfill existing templates
For the already-uploaded "Floral Pink" template (and any others with empty zones), the admin can simply re-open "Text Zones" from the admin card -- but now new templates will always have defaults.

## Files Changed

| File | Change |
|------|--------|
| `src/components/Admin/AdminInvitationTemplates.tsx` | Add `getDefaultTextZones(cardType)` function; include zones in `templateData` on create |
| `src/components/Dashboard/Invitations/InvitationCustomizer.tsx` | Improve the empty state message with guidance |

## Default Zone Specs (Invitation example)

```text
Zone 1: "Couple Names"  - auto:couple_names - y:18% - size:28px - Great Vibes
Zone 2: "Date"          - auto:date         - y:32% - size:16px - Playfair Display
Zone 3: "Time"          - auto:time         - y:40% - size:14px - Playfair Display
Zone 4: "Venue"         - auto:venue        - y:48% - size:14px - Playfair Display
Zone 5: "Dress Code"    - custom            - y:58% - size:12px - Montserrat
Zone 6: "RSVP Details"  - custom            - y:68% - size:12px - Montserrat
Zone 7: "Guest Name"    - guest_name        - y:78% - size:16px - Great Vibes
```

Save The Date and Thank You will have fewer zones with adjusted vertical spacing.

