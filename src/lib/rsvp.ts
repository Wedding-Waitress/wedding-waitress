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

export function getRsvpDisplayLabel(rsvp: string): string {
  const normalized = normalizeRsvp(rsvp);
  switch (normalized) {
    case "Attending":
      return "Accept";
    case "Not Attending":
      return "Decline";
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
