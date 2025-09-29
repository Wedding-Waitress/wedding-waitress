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
