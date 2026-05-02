Scope: Only the `Enable Relationships` `Switch` in `src/components/Dashboard/GuestListTable.tsx` (around line 1639–1643). No changes to `src/components/ui/switch.tsx`, no layout/label/logic changes anywhere.

Steps:

1. Keep current logic untouched:
   - `checked={!relationsHidden}`
   - `onCheckedChange={(checked) => handleHideRelationsToggle(!checked)}`

2. Replace the `className` on this single `Switch` with forced state-based track colours that override the base `data-[state=checked]:bg-success` / `data-[state=unchecked]:bg-[#D6C2A8]` defaults from the shared component:

   ```
   className="data-[state=checked]:!bg-green-500 data-[state=unchecked]:!bg-red-500 hover:data-[state=checked]:!bg-green-500 hover:data-[state=unchecked]:!bg-red-500"
   ```

3. Do not modify:
   - The shared `src/components/ui/switch.tsx` (avoids regressions on every other switch in the app — QR settings, Individual Table Chart, etc.).
   - Surrounding labels (`ON` / `OFF` text), spacing, container styling, or the expandable settings panel.
   - Step 1, Step 3, or any other component on the page.

Expected result:
- ON (checked) → solid green (`#22c55e`) track on desktop, tablet, mobile.
- OFF (unchecked) → solid red (`#ef4444`) track on desktop, tablet, mobile.
- Thumb, size, shape, and all other switches in the app unchanged.