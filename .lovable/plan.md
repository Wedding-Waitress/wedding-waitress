

## Add "Reset to Default" buttons to Text Zones and Messages tabs

### Text Zones tab (line 387)
Insert a "Reset to Default" button before the closing `</TabsContent>`. When clicked, it clears all text zones (`text_zones: []`) and shows a toast "Text Zones Reset".

**File:** `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`
- Before line 387 (`</div>` + `</TabsContent>`), add:
```
<div className="pt-4 border-t">
  <Button onClick={reset all text zones} variant="destructive" className="w-full rounded-full">
    Reset to Default
  </Button>
</div>
```
- Reset action: `onSettingsChange({ text_zones: [] })` + toast "Text Zones Reset"

### Messages tab (line 565)
Insert a "Reset to Default" button after the notes container. When clicked, it clears `localNotes` to empty string and shows a toast "Messages Reset".

**File:** same file
- Before line 565 (`</div>` + `</TabsContent>`), add same styled button that resets the notes/caption field.

Two small insertions in one file, matching the existing pattern from the Design and Background tabs.

