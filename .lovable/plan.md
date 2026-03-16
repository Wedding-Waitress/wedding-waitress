

## Adjust Preset Zone Defaults

### Changes in `src/components/Dashboard/Invitations/InvitationCardCustomizer.tsx`

**1. Move zones up** (line 180): Change starting y-position from `20` to `8`, keeping the `12%` spacing between each zone. This shifts all preset zones up by ~12 percentage points (roughly two line-heights on canvas).

```ts
// Before
const yOffset = 20 + textZones.length * 12;

// After  
const yOffset = 8 + textZones.length * 12;
```

Also update custom zone placement on line 195 to match.

**2. Make "You Are Invited" black** (line 187): Change `#0000FF` to `#000000`.

**3. Consistent spacing** — already uniform via the `index * 12` formula, so no change needed there. The same formula applies to line 195 for custom zones.

