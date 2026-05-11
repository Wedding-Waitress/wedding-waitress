## Print Size Cards — Visual Polish

Scope: `src/components/Dashboard/Signage/SignagePage.tsx`. UI/styling only. No export, state, or logic changes.

### 1. Add icons to `PRINT_SIZES`

Extend the lucide-react import (line 12) with:
`Presentation, MonitorSmartphone, ClipboardList, FileImage, CreditCard, PanelsTopLeft, Mail, Badge` (FileText already imported).

Add an `icon` field on the type and on each entry:

- a0 → Presentation
- a1 → MonitorSmartphone
- a2 → ClipboardList
- a3 → FileImage
- a4 → FileText
- a5 → CreditCard
- dl → PanelsTopLeft
- postcard → Mail
- business → Badge

### 2. Restyle each print-size card (lines 382–408)

Card root classes:
- Base: `lv-premium-shade text-left rounded-xl border p-3 min-h-[92px] flex flex-col gap-1 transition-all duration-200 ease-out hover:-translate-y-[1px]`
- Inactive: `border-primary/20 bg-[hsl(var(--primary)/0.035)] shadow-sm hover:border-primary/60 hover:bg-[hsl(var(--primary)/0.06)] hover:shadow-md`
- Active (green confirmed state): `border-green-500 bg-green-50 ring-2 ring-green-200 shadow-md`

Inside the card:
- Title row: render `<Icon className="h-4 w-4 transition-all duration-200 {active ? 'text-green-600' : 'text-primary/70'}" />` next to the label.
- Title: `text-green-700` when active, else `text-foreground`.
- Dimensions line: `text-green-600/80` when active, else `text-muted-foreground/80`.
- Helper "Best for…" line: `text-green-700/80` when active, else `text-foreground/70 leading-snug`.
- "✓ Selected for export": `text-green-700` when active.

Recommended badge:
- Active: `bg-green-100 border-green-300 text-green-700`
- Inactive: existing brown `bg-[hsl(var(--primary)/0.14)] text-primary border-primary/25`
- Add `transition-all duration-200 ease-out` to the badge.

### Out of scope
- PRINT_DIMENSIONS, handleDownloadPDF, exporter, preview, designer, mobile-specific redesign, orientation, recommended-usage cards below.
