export interface EventAllowanceLabelInput {
  created: number;
  allowance: number | null;
}

export const formatEventAllowanceLabel = ({
  created,
  allowance,
}: EventAllowanceLabelInput): string => {
  if (allowance === null || !Number.isFinite(allowance)) {
    return `Events: ${created} created \u00b7 Unlimited`;
  }

  return `Events: ${created} of ${allowance} created`;
};
