import { describe, it, expect } from 'vitest';
import { groupPhotoBoothSessions, orderPhotoBoothItems, boothSetPrefix } from './photoBoothSessions';

const item = (id: string, seq: number, strip = false) => ({
  id,
  source_category: 'photo_booth' as const,
  photo_booth_seq: seq,
  is_photo_booth_strip: strip,
});

describe('photoBoothSessions', () => {
  const set = [item('a', 1), item('b', 2), item('c', 3), item('d', 4), item('s', 5, true)];

  it('orders each set strip first', () => {
    expect(orderPhotoBoothItems(set).map(i => i.id)).toEqual(['s', 'a', 'b', 'c', 'd']);
  });

  it('groups multiple sessions oldest first', () => {
    const two = [...set, item('e', 6), item('t', 7, true)];
    const sessions = groupPhotoBoothSessions(two);
    expect(sessions.map(s => s.items.map(i => i.id))).toEqual([['s', 'a', 'b', 'c', 'd'], ['t', 'e']]);
  });

  it('reverses session order for newest first but keeps strip first', () => {
    const two = [...set, item('e', 6), item('t', 7, true)];
    expect(orderPhotoBoothItems(two, 'newest').map(i => i.id)).toEqual(['t', 'e', 's', 'a', 'b', 'c', 'd']);
  });

  it('keeps unfinished sets and ignores non-booth items', () => {
    const mixed = [item('a', 1), { id: 'x', source_category: 'guest_upload' as const }];
    expect(orderPhotoBoothItems(mixed as any).map(i => i.id)).toEqual(['a', 'x']);
  });

  it('builds sortable zip prefixes', () => {
    expect(boothSetPrefix(0, true)).toBe('01-photo-strip');
    expect(boothSetPrefix(1, false)).toBe('02-individual-photo-1');
    expect(boothSetPrefix(4, false)).toBe('05-individual-photo-4');
  });
});
