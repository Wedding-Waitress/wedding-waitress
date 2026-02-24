
# DJ-MC Questionnaire: Tooltips, Public View Buttons, and Footer Branding

## 3 Changes

### 1. Add Tooltips to Share Modal Buttons
**File**: `src/components/Dashboard/DJMCQuestionnaire/DJMCShareModal.tsx`

Wrap the three action buttons (Copy, Open Link, Delete) in the Manage tab with `Tooltip` components:
- Copy button: "Copy Link"
- External link button: "Open Link"  
- Trash button: "Delete Link"

Import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from the UI library.

### 2. Redesign Public View Header Buttons
**File**: `src/pages/DJMCPublicView.tsx`

Replace the current "View Only" badge and "Print" button (lines 306-314) with tablet-style buttons matching the Running Sheet public view:
- **View Only**: Red text, thick red border (`border-2 border-red-500 text-red-600`), rounded-full, no background
- **Download PDF**: Green text, thick green border (`border-2 border-green-500 text-green-600`), rounded-full, with a download icon. This will trigger `window.print()` (same as current Print button behavior)

### 3. Fix Footer Branding
**File**: `src/pages/DJMCPublicView.tsx`

Update the footer (lines 357-371) to match the standardized public-view footer:
- Use the correct logo: `/wedding-waitress-share-logo.png` at `h-10` height
- Make both the logo and "Powered by Wedding Waitress" text clickable links to `https://www.weddingwaitress.com`
- Open link in a new tab
