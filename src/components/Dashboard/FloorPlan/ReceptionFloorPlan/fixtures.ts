import {
  Heart,
  Mic2,
  Music2,
  Disc3,
  Wine,
  DoorOpen,
  Bath,
  ChefHat,
  Cake,
  Gift,
  Camera,
  Columns,
  RectangleHorizontal,
  HandCoins,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FixtureType =
  | 'bridal_table'
  | 'stage'
  | 'dance_floor'
  | 'bar'
  | 'door'
  | 'toilets'
  | 'kitchen'
  | 'dj_band'
  | 'cake_table'
  | 'gift_table'
  | 'photo_booth'
  | 'column'
  | 'wishing_well'
  | 'window';

export interface FixtureSpec {
  type: FixtureType;
  label: string;
  icon: LucideIcon;
  /** Default width/height in meters. */
  width_m: number;
  height_m: number;
  /** Fill color. */
  color: string;
  /** Text color over the fill. */
  textColor: string;
  shape: 'rect' | 'round';
}

export const FIXTURE_CATALOG: FixtureSpec[] = [
  { type: 'bridal_table', label: 'Bridal Table', icon: Heart, width_m: 4, height_m: 1, color: '#967A59', textColor: '#fff', shape: 'rect' },
  { type: 'stage', label: 'Stage', icon: Mic2, width_m: 4, height_m: 2, color: '#3F3F46', textColor: '#fff', shape: 'rect' },
  { type: 'dance_floor', label: 'Dance Floor', icon: Music2, width_m: 5, height_m: 5, color: '#FDE68A', textColor: '#1D1D1F', shape: 'rect' },
  { type: 'dj_band', label: 'DJ / Band', icon: Disc3, width_m: 3, height_m: 2, color: '#7C3AED', textColor: '#fff', shape: 'rect' },
  { type: 'bar', label: 'Bar', icon: Wine, width_m: 4, height_m: 1, color: '#B45309', textColor: '#fff', shape: 'rect' },
  { type: 'cake_table', label: 'Cake Table', icon: Cake, width_m: 1.2, height_m: 1.2, color: '#F472B6', textColor: '#fff', shape: 'round' },
  { type: 'gift_table', label: 'Gift Table', icon: Gift, width_m: 2, height_m: 1, color: '#10B981', textColor: '#fff', shape: 'rect' },
  { type: 'photo_booth', label: 'Photo Booth', icon: Camera, width_m: 2, height_m: 2, color: '#0EA5E9', textColor: '#fff', shape: 'rect' },
  { type: 'door', label: 'Door', icon: DoorOpen, width_m: 1, height_m: 0.2, color: '#22C55E', textColor: '#fff', shape: 'rect' },
  { type: 'toilets', label: 'Toilets', icon: Bath, width_m: 2, height_m: 2, color: '#64748B', textColor: '#fff', shape: 'rect' },
  { type: 'kitchen', label: 'Kitchen', icon: ChefHat, width_m: 3, height_m: 2, color: '#DC2626', textColor: '#fff', shape: 'rect' },
  { type: 'column', label: 'Column', icon: Columns, width_m: 0.5, height_m: 0.5, color: '#1D1D1F', textColor: '#fff', shape: 'round' },
  { type: 'wishing_well', label: 'Wishing Well', icon: HandCoins, width_m: 1.2, height_m: 1.2, color: '#8B3F68', textColor: '#fff', shape: 'round' },
  { type: 'window', label: 'Window', icon: RectangleHorizontal, width_m: 2, height_m: 0.2, color: '#BAE6FD', textColor: '#1D1D1F', shape: 'rect' },
];

/** Visual palette order only; persistence and placed-fixture arrays retain their existing order. */
export const FIXTURE_PALETTE_CATALOG = FIXTURE_CATALOG.filter((fixture) => fixture.type !== 'bridal_table').sort((a, b) =>
  a.label.localeCompare(b.label),
);

export const FIXTURE_BY_TYPE: Record<FixtureType, FixtureSpec> = FIXTURE_CATALOG.reduce(
  (acc, spec) => {
    acc[spec.type] = spec;
    return acc;
  },
  {} as Record<FixtureType, FixtureSpec>
);
