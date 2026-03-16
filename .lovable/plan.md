

## Change Preset Zone Headings to Dark Purple

**Task**: Change the color of preset zone headings and the "Add Custom Text Zone" button text to the Wedding Waitress dark purple (#7248E6).

**Changes in `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`:**

1. **Line 281** - "Add Preset Zone" label:
   ```tsx
   <Label className="text-sm font-semibold text-[#7248E6]">Add Preset Zone</Label>
   ```

2. **Line 286-296** - Preset zone buttons (You Are Invited, Event Name, Event Date, etc.):
   Add `text-[#7248E6]` to the Button className:
   ```tsx
   <Button
     key={pz.field}
     size="sm"
     variant="outline"
     onClick={() => addPresetZone(pz)}
     className="text-xs text-[#7248E6]"
     disabled={isDisabled}
   >
   ```

3. **Line 302-309** - "Add Custom Text Zone" button:
   Add `text-[#7248E6]` to the Button className:
   ```tsx
   <Button
     onClick={addCustomZone}
     variant="outline"
     className="w-full text-[#7248E6]"
   >
   ```

This applies the Wedding Waitress brand purple color to all the preset zone headings while keeping all other styling unchanged.

