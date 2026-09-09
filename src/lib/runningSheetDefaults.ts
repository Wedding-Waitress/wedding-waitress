import type { RunningSheetItem } from '@/types/runningSheet';

export const DEFAULT_RUNNING_SHEET_ROWS: Omit<RunningSheetItem, 'id' | 'sheet_id' | 'created_at' | 'updated_at'>[] = [
  { order_index: 0, time_text: '3.00 PM', description_rich: { text: 'Guests Arrive' }, responsible: '', is_section_header: false },
  { order_index: 1, time_text: '3.30 PM', description_rich: { text: 'Ceremony' }, responsible: 'Celebrant', is_section_header: true },
  { order_index: 2, time_text: '4.00 PM', description_rich: { text: 'Group & Family Photos' }, responsible: 'Photographer', is_section_header: false },
  { order_index: 3, time_text: '4.30 PM', description_rich: { text: 'Pre-Dinner Drinks & Canapés' }, responsible: 'Venue', is_section_header: false },
  { order_index: 4, time_text: '6.00 PM', description_rich: { text: 'Reception doors open & Guests Seated' }, responsible: 'Venue', is_section_header: true },
  { order_index: 5, time_text: '6.30 PM', description_rich: { text: 'Bridal Party Introduction', subText: '(Use the DJ-MC Questionnaire to organise the Bridal Party Introduction. You can sync it here.)' }, responsible: 'DJ / Band & MC\nPhotographer & Video', is_section_header: false },
  { order_index: 6, time_text: '7.00 PM', description_rich: { text: 'Entrée Served' }, responsible: 'Venue', is_section_header: true },
  { order_index: 7, time_text: '7.30 PM', description_rich: { text: '', bullets: ['Cake Cutting & Toasting for Photos', 'Bridal Dance', 'Bridal Party Dance with Wedding Couple', 'Dance Floor Open for All Guests'] }, responsible: 'DJ / Band & MC\nPhotographer & Video', is_section_header: false },
  { order_index: 8, time_text: '8.00 PM', description_rich: { text: 'Main Meals Served' }, responsible: 'Venue', is_section_header: true },
  { order_index: 9, time_text: '8.30 PM', description_rich: { text: 'Speeches', subText: '(Use the DJ-MC Questionnaire to organise Speeches. You can sync it here.)' }, responsible: 'MC\nPhotographer & Video', is_section_header: false },
  { order_index: 10, time_text: '9.00 PM', description_rich: { text: 'Games then Dance Bracket', bullets: ['The Shoe Game', 'The Photo Dash', 'Dance Floor opened'] }, responsible: 'DJ / Band & MC\nPhotographer & Video', is_section_header: false },
  { order_index: 11, time_text: '10.30 PM', description_rich: { text: '', bullets: ['Flower Toss', 'Garter Toss', 'Farewell Circle or Arch!'] }, responsible: 'DJ / Band & MC\nPhotographer & Video', is_section_header: false },
  { order_index: 12, time_text: '11.00 PM', description_rich: { text: 'Conclusion' }, responsible: '', is_section_header: true },
];
