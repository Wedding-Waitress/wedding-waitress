

## Problem

The "Watch on YouTube" link inside the YouTube embedded player (and potentially the external link below it) is blocked because the iframe lacks `sandbox` permissions that allow popups to escape the sandbox environment.

## Solution

Add the `sandbox` attribute to the YouTube and Spotify iframes with permissions that allow the built-in platform links to open in new tabs:

**File: `src/components/Dashboard/DJMCQuestionnaire/DJMCMusicUrlField.tsx`**

1. **YouTube iframe (line ~144-149)**: Add `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"` to allow the YouTube player's "Watch on YouTube" link to work.

2. **Spotify iframe (line ~161-165)**: Add the same `sandbox` attribute for consistency.

These sandbox permissions allow:
- `allow-scripts`: The player JS to run
- `allow-same-origin`: The player to function correctly
- `allow-popups`: Links inside the player to open new windows
- `allow-popups-to-escape-sandbox`: Those new windows to not inherit sandbox restrictions (so YouTube/Spotify actually loads)

No other changes needed.

