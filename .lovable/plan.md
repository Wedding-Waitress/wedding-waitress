

# Plan: Pricing Section Refinement

## Changes (all in `src/pages/Landing.tsx`)

### 1. Move trial text above cards
Move "All plans include a 7-day free trial..." from below the cards (line 366-368) to directly below the subtitle (after line 286). Style it with `text-base font-medium text-gray-600` for better visibility.

### 2. Update all 3 plan feature lists
Replace per-plan feature bullets with uniform text for all cards:
- Essential: "Up to 100 guests", "1 event", "Full access to all features"
- Premium: "Up to 300 guests", "1 event", "Full access to all features"
- Unlimited: "Unlimited guests", "1 event", "Full access to all features"

Remove all old feature text (Guest list management, Seating tools, Basic planning features, Everything in Essential, QR code guest seating, Invitations & RSVP tools, All features unlocked, Unlimited events & guests).

### 3. Fix Unlimited plan
Change subtitle from "Unlimited guests · 12-month access" — keep as-is but ensure feature list says "1 event" not "Unlimited events".

### 4. Add Vendor Pro as 4th card
Add a 4th card after the 3 main plans. Change grid from `md:grid-cols-3` to a 4-column layout (`lg:grid-cols-4 md:grid-cols-2`).

**Vendor Pro card:**
- Dark/outlined style (dark background `bg-gray-900 text-white` or bordered outline)
- Badge: "For Professionals"
- Icon: `Building2`
- Price: $249/month
- Subtext: "For venues & event professionals"
- Features: "Unlimited events", "Unlimited guests", "Full platform access"
- Small note: "Approval required" in muted text
- Button: "Get Started" with outline-on-dark styling

### 5. Remove old trial note line (line 366-368)
Already moved above.

## Files Modified
1. `src/pages/Landing.tsx` — Pricing section restructure only

