I checked the actual Guest List code and found the problem: the previous change was applied to the toggle’s visual checked/unchecked state, but this specific toggle uses inverted logic:

- `relationsHidden = false` means relationships are enabled (ON)
- `relationsHidden = true` means relationships are disabled (OFF)
- The switch is currently set as `checked={relationsHidden}`, so the switch appears “checked” when relationships are actually OFF.

That means the previous styling made the checked state green, which incorrectly makes OFF look green. That is why you did not see the correct result after refreshing/publishing.

Plan:
1. Update only the `Enable Relationships` switch in `src/components/Dashboard/GuestListTable.tsx`.
2. Change its color classes so the current inverted state is displayed correctly:
   - when `relationsHidden` is `false` / relationships ON: green background
   - when `relationsHidden` is `true` / relationships OFF: red background
3. Keep the toggle behavior, labels, layout, and all other Guest List styling unchanged.
4. Verify the code path so the ON/OFF label colors and the toggle background now match the actual relationship setting.

I also need to be clear: the earlier response should not have claimed it was fixed without validating this inverted state logic. The change was made in the right area, but the boolean meaning was misunderstood, so it did not produce the requested visual behavior.