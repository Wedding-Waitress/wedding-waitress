

# Card Size Rules by Card Type

## Summary

Enforce card size rules based on the card type selected. Invitations are always A4. Save the Date offers A4 or A5. Thank You offers A4, A5, or A6. The size is chosen at artwork creation and cannot be changed afterwards.

## Rules

| Card Type     | Allowed Sizes | Default |
|---------------|---------------|---------|
| Invitation    | A4 only       | A4      |
| Save the Date | A4, A5        | A5      |
| Thank You     | A4, A5, A6    | A6      |

Once an artwork is created with a size, that size is locked -- the user cannot change it. The PDF export engine will use the artwork's stored `card_size` to determine output dimensions at 300 DPI.

## A6 Dimensions

A6 = 105mm x 148mm (half of A5). At 300 DPI this is approximately 1240 x 1748 pixels. This fits a standard C6 envelope (114mm x 162mm), the most common Australian greeting card envelope.

## Changes Required

### 1. Artwork Creation Dialog (InvitationsPage.tsx)

Replace the simple "New [type]" button click with a small dialog/popover:
- For **Invitation**: no size choice shown, auto-creates at A4
- For **Save the Date**: show A4/A5 radio buttons, then a name field, then "Create"
- For **Thank You**: show A4/A5/A6 radio buttons, then a name field, then "Create"

The `createArtwork` function will be updated to accept `cardSize` as a parameter.

### 2. Hook Update (useInvitationCardSettings.ts)

- Update `createArtwork(cardType, name)` signature to `createArtwork(cardType, name, cardSize)`
- Pass `card_size` in the insert payload
- For Invitation type, always force `card_size: 'A4'`

### 3. Remove Card Size from Customizer (InvitationCardCustomizer.tsx)

- Remove or hide the card size dropdown from the customizer panel (size is set at creation and locked)
- Display the current size as a read-only badge/label so the user knows what size their artwork is

### 4. Preview Update (InvitationCardPreview.tsx)

- Add A6 dimensions to the preview size mapping (105mm x 148mm)
- Ensure the preview correctly renders all three sizes

### 5. Export Engine (invitationExporter.ts)

- Add A6 format support: 105mm x 148mm, ~1240 x 1748 pixels at 300 DPI
- The exporter already reads `widthMm` and `heightMm` from settings, so this mostly requires ensuring A6 values are passed correctly

## Files to Modify

1. `src/components/Dashboard/Invitations/InvitationsPage.tsx` -- Add creation dialog with size selection per card type
2. `src/hooks/useInvitationCardSettings.ts` -- Add `cardSize` parameter to `createArtwork`
3. `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx` -- Lock card size display (read-only badge)
4. `src/components/Dashboard/Invitations/InvitationCardPreview.tsx` -- Add A6 dimensions
5. `src/lib/invitationExporter.ts` -- Add A6 constants

