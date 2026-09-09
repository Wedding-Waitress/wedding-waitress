export const INVITATION_CARD_SIZES = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  A6: { w: 105, h: 148 },
} as const;
export type InvitationCardSize = keyof typeof INVITATION_CARD_SIZES;
export type InvitationCardKind = 'invitation' | 'save_the_date' | 'thank_you';
export const ALLOWED_INVITATION_SIZES: Record<InvitationCardKind, readonly InvitationCardSize[]> = {
  invitation: ['A4', 'A5'], save_the_date: ['A4', 'A5'], thank_you: ['A6'],
};
export const DEFAULT_INVITATION_SIZES: Record<InvitationCardKind, InvitationCardSize> = {
  invitation: 'A5', save_the_date: 'A5', thank_you: 'A6',
};
export function resolveInvitationCardSize(kind: InvitationCardKind, size?: string): InvitationCardSize {
  return ALLOWED_INVITATION_SIZES[kind].includes(size as InvitationCardSize) ? size as InvitationCardSize : DEFAULT_INVITATION_SIZES[kind];
}
