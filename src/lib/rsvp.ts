export type RsvpStatus = "Pending" | "Attending" | "Not Attending";

const ATTENDING_ALIASES = [
  "attending",
  "confirmed",
  "yes",
  "y",
  "going",
  "accepted",
  "confirm",
  "accept",
];

const NOT_ATTENDING_ALIASES = [
  "not attending",
  "declined",
  "no",
  "n",
  "cant",
  "can't",
  "cannot",
  "deny",
  "decline",
];

export function normalizeRsvp(input: string | null | undefined): RsvpStatus {
  const val = String(input ?? "").trim().toLowerCase();
  if (ATTENDING_ALIASES.includes(val)) return "Attending";
  if (NOT_ATTENDING_ALIASES.includes(val)) return "Not Attending";
  return "Pending";
}

/**
 * A non-pending value alone is not proof that a guest replied: organisers can
 * preassign an RSVP value while creating or editing a guest. Guest-facing RSVP
 * submissions also stamp rsvp_date, which is the persisted response marker.
 */
export function hasGuestResponded(
  rsvp: string | null | undefined,
  rsvpDate: string | null | undefined,
): boolean {
  return Boolean(rsvpDate) && normalizeRsvp(rsvp) !== "Pending";
}

export function getDefaultRsvpInviteRecipientIds<
  T extends { id: string; rsvp?: string | null; rsvp_date?: string | null },
>(guests: T[]): string[] {
  return guests.filter((guest) => !hasGuestResponded(guest.rsvp, guest.rsvp_date)).map((guest) => guest.id);
}

export function getRsvpDisplayLabel(rsvp: string): string {
  const normalized = normalizeRsvp(rsvp);
  switch (normalized) {
    case "Attending":
      return "Attending";
    case "Not Attending":
      return "Not Attending";
    case "Pending":
      return "Pending";
    default:
      return "Pending";
  }
}

export function getRsvpBadgeVariant(rsvp: string): "default" | "secondary" | "destructive" | "success" | "warning" {
  const normalized = normalizeRsvp(rsvp);
  switch (normalized) {
    case "Attending":
      return "success";
    case "Not Attending":
      return "destructive";
    case "Pending":
      return "warning";
    default:
      return "warning";
  }
}

export function getRsvpIconName(rsvp: string): string {
  const normalized = normalizeRsvp(rsvp);
  switch (normalized) {
    case "Attending":
      return "CheckCircle2";
    case "Not Attending":
      return "XCircle";
    case "Pending":
      return "Clock";
    default:
      return "Clock";
  }
}
