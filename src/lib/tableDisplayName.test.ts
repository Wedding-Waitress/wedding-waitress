import { describe, expect, it } from 'vitest';
import { tableDisplayName } from './tableDisplayName';

describe('tableDisplayName', () => {
  it('prefixes a numeric storage name with Table', () => {
    expect(tableDisplayName({ name: '4', table_no: 4 })).toBe('Table 4');
  });

  it('preserves a custom table name', () => {
    expect(tableDisplayName({ name: 'Head Table', table_no: 1 })).toBe('Head Table');
  });

  it('falls back safely when a name is absent', () => {
    expect(tableDisplayName({ name: null, table_no: 7 })).toBe('Table 7');
    expect(tableDisplayName(null)).toBe('—');
  });
});
