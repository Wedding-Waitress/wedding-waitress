

## Plan: Remove Design tab and move Card Size info to Background tab

### Summary
Remove the "Design" tab entirely from the Invitations customizer. Move the "Card Size" display block into the Background tab, inserting it between the "Choose File / Image Gallery" buttons row and the "Edit with Canva" button.

### File Changes

#### `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`

1. **Remove the Design tab trigger** (line 178): Change `grid-cols-4` to `grid-cols-3` and delete the `<TabsTrigger value="design">Design</TabsTrigger>`.

2. **Change default tab** (line 176): From `defaultValue="design"` to `defaultValue="text-zones"`.

3. **Delete the entire Design TabsContent** (lines 184-235): Remove the whole `<TabsContent value="design">` block including Default Font, Default Font Color, Card Size, and Reset to Default button.

4. **Insert Card Size block in Background tab** (after line 481, before line 482 — between the Choose File/Image Gallery buttons `</div>` and the Canva button): Add:
   - `<div className="mt-3">` containing:
     - `<Label className="mb-2 block">Card Size</Label>`
     - The A4 pill badge: `<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">A4 (210 × 297mm)</div>`
     - Helper text: `<p className="text-xs text-muted-foreground mt-1">Size is locked at creation and cannot be changed. If you want to print in A5, please get your printer or designer to change the size. Quality will remain the same.</p>`

