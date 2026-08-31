export type GuestCreationPrerequisite = 'select-event' | 'loading-tables' | 'create-tables' | null;

export const getGuestCreationPrerequisite = (
  selectedEventId: string | null | undefined,
  tablesLoading: boolean,
  tableCount: number,
): GuestCreationPrerequisite => {
  if (!selectedEventId) return 'select-event';
  if (tablesLoading) return 'loading-tables';
  if (tableCount === 0) return 'create-tables';
  return null;
};
