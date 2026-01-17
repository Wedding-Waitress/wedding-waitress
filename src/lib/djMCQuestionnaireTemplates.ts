// Default templates for DJ-MC Questionnaire sections
import { DefaultSectionTemplate, SectionType } from '@/types/djMCQuestionnaire';

export const DEFAULT_SECTION_TEMPLATES: DefaultSectionTemplate[] = [
  {
    section_type: 'ceremony',
    section_label: 'Ceremony Music',
    items: [
      { row_label: 'Prelude (As Guests Arrive) × 10 Songs (Optional)', has_music_url: true, has_pronunciation: true },
      { row_label: 'Processional (Bridesmaids Entrance) × 1 Song', has_music_url: true, has_pronunciation: true },
      { row_label: 'Bride Walking Down the Aisle × 1 Song', has_music_url: true, has_pronunciation: true },
      { row_label: 'Interlude (During Signing) × 2 Songs', has_music_url: true, has_pronunciation: true },
      { row_label: 'Recessional (Newlyweds Exit) × 1 Song', has_music_url: true, has_pronunciation: true },
    ],
  },
  {
    section_type: 'cocktail',
    section_label: 'Cocktail Hour Music',
    items: [
      { row_label: 'Song 1', has_music_url: true },
      { row_label: 'Song 2', has_music_url: true },
      { row_label: 'Song 3', has_music_url: true },
    ],
  },
  {
    section_type: 'introductions',
    section_label: 'Bridal Party Introductions (Names & Order)',
    items: [
      { row_label: "Groom's Parents (Full Names)", has_pronunciation: true, has_music_url: true },
      { row_label: "Bride's Parents (Full Names)", has_pronunciation: true, has_music_url: true },
      { row_label: 'Flower Girl & Page Boy (First Names Only)', has_pronunciation: true, has_music_url: true },
      { row_label: 'Groomsman & Bridesmaid (First Names Only)', has_pronunciation: true, has_music_url: true },
      { row_label: 'Best Man & Maid/Matron of Honour (First Names Only)', has_pronunciation: true, has_music_url: true },
      { row_label: 'Groom & Bride (Announce as Mr & Mrs?)', has_pronunciation: true, has_music_url: true },
    ],
  },
  {
    section_type: 'speeches',
    section_label: 'Speeches',
    items: [
      { row_label: 'Father of the Bride' },
      { row_label: 'Father of the Groom' },
      { row_label: 'Mother of the Bride' },
      { row_label: 'Mother of the Groom' },
      { row_label: 'Best Man' },
      { row_label: 'Maid/Matron of Honour' },
      { row_label: 'Groom & Bride' },
    ],
  },
{
    section_type: 'main_event',
    section_label: 'Main Event Songs',
    items: [
      { row_label: 'Cake Cutting & Toast Song', has_music_url: true, has_pronunciation: true },
      { row_label: 'First Bridal Dance', has_music_url: true, has_pronunciation: true },
      { row_label: 'Second Bridal Dance with Guests', has_music_url: true, has_pronunciation: true },
      { row_label: 'Father/Daughter Dance', has_music_url: true, has_pronunciation: true },
      { row_label: 'Mother/Son Dance', has_music_url: true, has_pronunciation: true },
      { row_label: 'Bouquet Toss Song', has_music_url: true, has_pronunciation: true },
      { row_label: 'Garter Toss Song', has_music_url: true, has_pronunciation: true },
      { row_label: 'Farewell Circle / Arch Song', has_music_url: true, has_pronunciation: true },
    ],
  },
  {
    section_type: 'dinner',
    section_label: 'Background Dinner Music',
    items: [
      { row_label: 'Song 1', has_music_url: true },
      { row_label: 'Song 2', has_music_url: true },
      { row_label: 'Song 3', has_music_url: true },
    ],
  },
  {
    section_type: 'dance',
    section_label: 'Dance Music',
    items: [
      { row_label: 'Song 1', has_music_url: true },
      { row_label: 'Song 2', has_music_url: true },
      { row_label: 'Song 3', has_music_url: true },
    ],
  },
  {
    section_type: 'traditional',
    section_label: 'Traditional/Multicultural Music',
    items: [
      { row_label: 'Song 1', has_music_url: true, has_pronunciation: true },
      { row_label: 'Song 2', has_music_url: true, has_pronunciation: true },
      { row_label: 'Song 3', has_music_url: true, has_pronunciation: true },
    ],
  },
  {
    section_type: 'do_not_play',
    section_label: 'Do Not Play List',
    section_subtitle: 'Following songs are not to be played',
    items: [
      { row_label: '' },
      { row_label: '' },
      { row_label: '' },
    ],
  },
];

export const SECTION_ORDER: SectionType[] = [
  'ceremony',
  'cocktail',
  'introductions',
  'speeches',
  'main_event',
  'dinner',
  'dance',
  'traditional',
  'do_not_play',
];

// Helper to detect music platform from URL
export function detectMusicPlatform(url: string): 'youtube' | 'spotify' | 'apple' | 'unknown' {
  if (!url) return 'unknown';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('spotify.com')) return 'spotify';
  if (lowerUrl.includes('music.apple.com')) return 'apple';
  return 'unknown';
}

// Extract YouTube video ID from URL
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Extract Spotify track/playlist ID from URL
export function extractSpotifyId(url: string): { type: 'track' | 'playlist' | 'album'; id: string } | null {
  if (!url) return null;
  const match = url.match(/spotify\.com\/(track|playlist|album)\/([^?]+)/);
  if (match) {
    return { type: match[1] as 'track' | 'playlist' | 'album', id: match[2] };
  }
  return null;
}
