

## Auto-Note Extra Guests Added via Live View + Flashing Indicator

### What This Does
When a guest adds extra guests via the public Live View "Plus Guest" button, the system will:
1. Automatically append a note to the **referring guest's** notes field (e.g., "Adam Saad has added: John Smith, Jane Doe")
2. Show the Notes badge as **green "Yes"** with a **flashing animation** to alert the organiser
3. Stop flashing once the organiser clicks Edit on that guest (acknowledging the notification)

### File 1: `src/components/GuestLookup/PublicAddGuestModal.tsx`

After successfully adding guest(s), update the **referring guest's** notes field:
- After the `add_guest_public` RPC call(s) succeed, build a note string: `"{ReferringGuestName} has added: {NewGuest1 FirstName LastName}, {NewGuest2 FirstName LastName}"`
- Use `supabase.from('guests').update()` to append this text to the referring guest's existing `notes` field (preserving any existing notes with a newline separator)
- Also set a new flag column or use a convention (e.g., prefix `[PLUS_GUEST_ALERT]`) in the notes to signal the flashing behaviour

**Simpler approach (no DB migration):** Instead of a new column, we prepend `[NEW+]` marker to the referring guest's notes when extra guests are added. The Guest List table detects this marker to trigger flashing. When the Edit modal opens, the marker is stripped.

### File 2: `src/hooks/useGuests.ts`

Add `added_by_guest_id` to the Guest interface so it's available in the guest list table.

### File 3: `src/components/Dashboard/GuestListTable.tsx`

**Notes column rendering (~line 2068-2082):**
- Detect if `guest.notes` contains the `[NEW+]` marker
- If yes: render the green "Yes" badge with a CSS flashing animation class (`animate-pulse` or custom keyframe)
- If no marker but notes exist: render normal green "Yes" badge (no flash)
- No notes: render red "No" badge as current

**Edit button handler (~line 1338):**
- When `handleEditGuest` is called, if the guest's notes contain `[NEW+]`, strip the marker and update the DB immediately (acknowledge the alert)
- This stops the flashing on the next render

### File 4: `src/App.css` or inline Tailwind

Add a flashing animation if `animate-pulse` isn't sufficient:
```css
@keyframes flash-badge {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.animate-flash { animation: flash-badge 1s ease-in-out infinite; }
```

### Implementation Flow

```text
Guest scans QR → clicks "Plus Guest" → adds "John Smith"
                                          │
                                          ▼
                          PublicAddGuestModal:
                          1. Calls add_guest_public (John Smith added to guests table)
                          2. Updates referring guest's notes:
                             "[NEW+]Adam Saad has added: John Smith"
                                          │
                                          ▼
                          Dashboard Guest List (realtime sync):
                          - Notes column shows flashing green "Yes" badge
                          - Organiser clicks Edit icon
                          - [NEW+] marker stripped, flashing stops
                          - Notes show: "Adam Saad has added: John Smith"
```

### Layout Order (unchanged)
No changes to column order or other UI elements. Only the Notes badge behaviour and the PublicAddGuestModal save logic are modified.

