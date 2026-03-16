

## Update Preset Zone Defaults: Fonts, Sizes & Spacing

### Changes in `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`

**1. Per-preset Y positions** — Replace the generic `8 + textZones.length * 12` formula in `addPresetZone` with a lookup map that assigns specific Y positions per preset field:

| Preset | Y% | Gap from previous |
|---|---|---|
| You Are Invited | 14 | — |
| Event Name | 26 | 12 |
| Event Date | 38 | 12 |
| Ceremony Info | 44 | 6 (closer) |
| Reception Info | 50 | 6 (up one) |
| Dress Code | 56 | 6 (up one) |
| RSVP Deadline | 62 | 6 (up one) |

Falls back to `8 + textZones.length * 12` for any unknown preset.

**2. Per-preset font/size overrides** — Replace the current `you_are_invited`-only block with a lookup that applies:

| Preset | Font | Size | Color |
|---|---|---|---|
| you_are_invited | ET Emilia Grace Demo | 24px | #000000 |
| event_name | Great Vibes | 56px | #000000 |
| All others | ET Emilia Grace Demo | 20px | #000000 |

**3. Default zone font** — Update `createDefaultZone` to use `ET Emilia Grace Demo` at 20px instead of `Inter` at 24px (affects custom text zones).

**4. Custom zone Y** — Keep `addCustomZone` using the generic formula `8 + textZones.length * 12`.

