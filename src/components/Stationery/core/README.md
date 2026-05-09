# Stationery Core

Shared stationery/signage engine boundary for Wedding Waitress.

## Purpose

This folder is the **single canonical entry point** for any stationery-style
editor (Invitations, Save the Date, Thank You, QR Seating Signs, and any
future signage/stationery modules).

It re-exports the existing Invitations primitives so that:

- All stationery modules consume the same components, hooks, and exporter.
- Invitations and Signage cannot drift into separate editor ecosystems.
- Future modules can be built by composing these primitives — never by
  forking `InvitationCardCustomizer` again.

## DOM-preservation guardrail (locked 2026-05-09)

Per owner instruction:

> During extraction, preserve all existing DOM hierarchy/order for
> Invitations wherever possible. Do not refactor merely for code elegance
> if it risks changing rendering, spacing, hydration, responsiveness, or
> export output.

Therefore this folder is intentionally a **thin re-export layer** around the
battle-tested Invitations implementation, not a JSX rewrite. The underlying
files in `src/components/Dashboard/Invitations/` and
`src/lib/invitationExporter.ts` remain the source of truth for markup and
behavior.

## Public API

```ts
import {
  StationeryCustomizer,         // = InvitationCardCustomizer
  StationeryPreview,            // = InvitationCardPreview
  exportStationeryPDF,          // = exportInvitationPDF
  exportStationeryPNG,          // = exportInvitationPNG
  buildStationeryElement,       // = buildInvitationElement
  captureStationeryElement,     // = captureElement
  generateStationeryQR,         // = generateInvitationQR
} from '@/components/Stationery/core';

import type {
  StationerySettings,           // = InvitationCardSettings
  StationeryTextZone,           // = TextZone
  StationeryQrConfig,           // = QrConfig
  StationeryPresetZoneDef,      // = PresetZoneDef
} from '@/components/Stationery/core';
```

## Rules for new stationery modules

1. Import only from `@/components/Stationery/core`.
2. Do not duplicate or fork `InvitationCardCustomizer` / `InvitationCardPreview`.
3. Configure variation via the existing override props
   (`headerTitle`, `presetZones`, `presetYPositions`, `presetStyles`,
   `bgSectionTitle`, `qrTabTitle`, `imageUploadFolder`, `storageBucket`, …).
4. Use the existing exporter; vary only filename / orientation.
5. If you need something the current props can't express, extend
   `InvitationCardCustomizer` additively (new optional prop, default = current
   behavior) — never branch the component.
