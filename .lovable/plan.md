I checked the current Guest List code and found why it still looks wrong in the screenshot.

The current code colours the Radix switch based on its internal `checked/unchecked` state, but this specific UI is visually arranged as:

```text
ON   [toggle]   OFF
```

The switch itself is still using `checked={relationsHidden}`, where:

```text
relationsHidden = false  -> relationships are ON
relationsHidden = true   -> relationships are OFF
```

So the switch’s `checked` state means OFF, not ON. The previous code tried to compensate with state-based classes, but because the switch is positioned between the ON/OFF labels and the thumb movement is also tied to `checked`, the visible result is still confusing/wrong.

Plan:

1. Update only the `Enable Relationships` toggle in `src/components/Dashboard/GuestListTable.tsx`.
2. Change the switch to use normal positive logic:
   - `checked={!relationsHidden}`
   - when toggled ON, call `handleHideRelationsToggle(false)`
   - when toggled OFF, call `handleHideRelationsToggle(true)`
3. Set the switch background directly to:
   - green when checked / ON
   - red when unchecked / OFF
4. Keep all labels, layout, card styling, relationship behaviour, save logic, and other Guest List features unchanged.

This should make the visual state match what you asked for: ON = green toggle background, OFF = red toggle background.