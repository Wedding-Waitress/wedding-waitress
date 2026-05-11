## Scope
`src/components/Dashboard/Signage/SignagePage.tsx` — only the Export Controls block (lines 310–327). No other section, no PDF logic.

## Visual changes

Restyle the small bordered box into a larger premium "Print & Export Studio" panel:

- Heading: `Export Controls` → **`Print & Export Studio`** (larger, semibold, brown `text-primary`).
- New muted subtitle directly underneath: **`Wedding Waitress Signs • Print Studio • QR Experience`** (xs, `text-muted-foreground`, tracking-wide).
- Keep the existing one-liner ("Download your sign as a print-ready PDF.") as a third line for clarity.
- Increase padding (`p-5 lg:p-6`), gap (`gap-4`), and add stronger shadow (`shadow-soft`) + double-border feel via `border-primary/60` and inner subtle gradient background using brown tones already in the palette (`bg-gradient-to-br from-background to-[hsl(var(--primary)/0.04)]`).
- Rounded `rounded-2xl` to match SaaS premium look used elsewhere.
- The "Download Print-Ready PDF" button stays exactly as-is (no logic, no label, no styling changes).
- Fully responsive: full-width on mobile/tablet (`w-full`), auto width on `lg:` like today.

## Out of scope
- PDF export logic, filename, or button styling.
- Size selectors, dropdowns, modals.
- Any other page or section (header card, designer, preview, sidebar).
- Removing the already-removed PNG references (none remain in this section).
