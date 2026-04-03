

## Plan: Match DJ-MC Questionnaire PDF Font Sizes to Running Sheet PDF

### Problem
The DJ-MC Questionnaire PDF uses jsPDF point sizes that are significantly larger than the Running Sheet's HTML pixel-based rendering. Since jsPDF uses typographic points (1pt = 1/72 inch) and the Running Sheet HTML renders at 96 DPI (1px = 1/96 inch), the conversion is: **HTML px × 0.75 = jsPDF pt**.

### Current vs Target Sizes

| Element | Running Sheet (HTML px) | Questionnaire Current (jsPDF pt) | Questionnaire Target (jsPDF pt) |
|---------|------------------------|----------------------------------|--------------------------------|
| Event name | 22px | 22pt | **16pt** |
| Subtitle | 16px | 16pt | **12pt** |
| Detail lines | 12px | 12pt | **9pt** |
| Section headings | N/A (red bold in rows) | 14pt | **11pt** |
| Body/row text | 12px | 9pt | **9pt** (no change) |

### File: `src/lib/djMCQuestionnairePdfExporter.ts`

**Change 1 — Header event name (line 372):** `setFontSize(22)` → `setFontSize(16)`

**Change 2 — Subtitle (line 378):** `setFontSize(16)` → `setFontSize(12)`. Also remove bold — Running Sheet subtitle is not bold. Change font to `'helvetica', 'normal'`.

**Change 3 — Detail lines (line 385):** `setFontSize(12)` → `setFontSize(9)`

**Change 4 — Adjust vertical spacing after header elements** to match the tighter Running Sheet layout:
- After event name: `yPos += 8` → `yPos += 6`
- After subtitle: `yPos += 7` → `yPos += 5`
- After detail lines: `yPos += 5` → `yPos += 4`
- After divider: `yPos += 10` → `yPos += 8`

**Change 5 — Section headings (line 269):** `setFontSize(14)` → `setFontSize(11)`

No other changes. Body text (9pt), column headers (8pt), row heights, footer, and all other layout remain untouched.

