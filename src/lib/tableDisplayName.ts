type TableDisplayFields = {
  name?: string | null;
  table_no?: number | null;
};

export const tableDisplayName = (table?: TableDisplayFields | null): string => {
  if (!table) return '—';

  const name = table.name?.trim();
  if (name && (!table.table_no || name !== String(table.table_no))) return name;
  if (table.table_no) return `Table ${table.table_no}`;
  return name || '—';
};
