export type OperationalCursor = { at: string | null; id: string };
export const OPERATIONAL_PAGE_SIZE = 500;

/** Restrict every cursor component before using PostgREST filter syntax. */
export function parseOperationalCursor(value: unknown): OperationalCursor {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid history cursor');
  const cursor = value as Record<string, unknown>;
  if (Object.keys(cursor).some(key => !['at', 'id'].includes(key)) || typeof cursor.id !== 'string'
    || !/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{1,20})$/i.test(cursor.id)
    || cursor.at !== null && (typeof cursor.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(cursor.at) || !Number.isFinite(Date.parse(cursor.at)))) throw new Error('Invalid history cursor');
  return { at: cursor.at as string | null, id: cursor.id };
}

export function operationalPage(rows: unknown, order: string) {
  if (!Array.isArray(rows) || !rows.every((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row))) {
    throw new Error('Invalid operational rows');
  }
  const records = rows.slice(0, OPERATIONAL_PAGE_SIZE);
  const last = records.at(-1);
  const has_more = rows.length > OPERATIONAL_PAGE_SIZE;
  return { records, page: { has_more, cursor: has_more && last ? { at: last[order] ?? null, id: String(last.id) } : null } };
}
