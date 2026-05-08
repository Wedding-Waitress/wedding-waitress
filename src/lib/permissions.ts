// Single source of truth for role → action mapping.
// Phase 1: Master vs Standard. Future collaborator roles
// (bride, groom, planner, venue_staff) plug in here without
// touching call sites.
import type { AccountRole } from '@/hooks/useAccountRole';

export interface PermissionInput {
  role: AccountRole;
  // TODO(phase 2): collaboratorRole?: 'owner' | 'collaborator' | 'client' | 'bride' | 'groom';
}

const isMaster = (i: PermissionInput) => i.role === 'master';

export const can = {
  manageBilling: isMaster,
  changePlan: isMaster,
  purchaseEvents: isMaster,
  deleteEvent: isMaster,
  manageUsers: isMaster,
  manageVendorPro: isMaster,
  deleteAccount: isMaster,
};

export const RESTRICTED_REASON =
  'Only the Master Account Holder can manage billing and account access.';
