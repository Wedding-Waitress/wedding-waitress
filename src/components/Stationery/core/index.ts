/**
 * Stationery Core — shared editor/preview/export engine for all
 * stationery-style modules (Invitations, Save the Date, Thank You,
 * QR Seating Signs, …).
 *
 * This is intentionally a thin re-export layer around the existing
 * Invitations implementation. See ./README.md for the rationale and
 * the DOM-preservation guardrail (locked 2026-05-09).
 *
 * RULE: new stationery modules MUST import from here, not from
 * `Dashboard/Invitations/*` directly. Do not fork these components.
 */

// Components — single source of truth lives in Dashboard/Invitations
export {
  InvitationCardCustomizer as StationeryCustomizer,
} from '@/components/Dashboard/Invitations/InvitationCardCustomizer';
export {
  InvitationCardPreview as StationeryPreview,
} from '@/components/Dashboard/Invitations/InvitationCardPreview';

// Exporter primitives
export {
  exportInvitationPDF as exportStationeryPDF,
  exportInvitationPNG as exportStationeryPNG,
  buildInvitationElement as buildStationeryElement,
  captureElement as captureStationeryElement,
} from '@/lib/invitationExporter';

// QR generator
export { generateInvitationQR as generateStationeryQR } from '@/lib/invitationQR';

// Types
export type {
  InvitationCardSettings as StationerySettings,
  TextZone as StationeryTextZone,
  QrConfig as StationeryQrConfig,
} from '@/hooks/useInvitationCardSettings';

export type { PresetZoneDef as StationeryPresetZoneDef } from '@/components/Dashboard/Invitations/InvitationCardCustomizer';
