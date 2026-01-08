// Types for the new DJ-MC Questionnaire feature

export interface DJMCQuestionnaire {
  id: string;
  event_id: string;
  created_by: string;
  template_type: 'wedding' | 'event';
  status: 'draft' | 'sent' | 'approved';
  recipient_emails: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  header_overrides: HeaderOverrides | null;
}

export interface HeaderOverrides {
  dj_name?: string;
  dj_phone?: string;
  mc_name?: string;
  mc_phone?: string;
  venue_override?: string;
  ceremony_start?: string;
  reception_start?: string;
}

export interface DJMCSection {
  id: string;
  questionnaire_id: string;
  label: string;
  sort_index: number;
  section_type: SectionType;
  instructions?: string;
  max_rows?: number;
}

export type SectionType = 
  | 'ceremony_music'
  | 'bridal_party'
  | 'speeches'
  | 'cocktail_hour_music'
  | 'main_event_songs'
  | 'background_music'
  | 'dance_music'
  | 'cultural_music'
  | 'do_not_play';

export interface DJMCItem {
  id: string;
  section_id: string;
  sort_index: number;
  item_type: ItemType;
  data: ItemData;
  pronunciation_audio_url?: string | null;
}

export type ItemType = 'song' | 'name' | 'speech' | 'do_not_play';

export interface SongData {
  moment?: string;
  song_title: string;
  artist: string;
  link?: string;
}

export interface NameData {
  role: string;
  names: string;
  pronunciation?: string;
  entrance_song?: SongData;
}

export interface SpeechData {
  order: number;
  name: string;
  role: string;
  notes?: string;
}

export interface DoNotPlayData {
  song_or_genre: string;
  notes?: string;
}

export type ItemData = SongData | NameData | SpeechData | DoNotPlayData;

export interface DJMCQuestionnaireWithData extends DJMCQuestionnaire {
  sections: (DJMCSection & { items: DJMCItem[] })[];
}

// Default template data - Updated per user specifications
export const CEREMONY_MUSIC_MOMENTS = [
  'Bridesmaids Walking Down the Aisle',
  'Bride Walking Down the Aisle',
  'During the Ceremony - Signing the Registry',
  'Leaving the Chapel - Ceremony',
];

export const BRIDAL_PARTY_DEFAULTS = [
  { role: "Groom's Parents", placeholder: 'Full names' },
  { role: "Bride's Parents", placeholder: 'Full names' },
  { role: 'Page Boy & Flower Girl', placeholder: 'First names' },
  { role: 'Groomsman & Bridesmaid', placeholder: 'First names' },
  { role: 'Groomsman & Bridesmaid', placeholder: 'First names' },
  { role: 'Groomsman & Bridesmaid', placeholder: 'First names' },
  { role: 'Best Man & Maid of Honor', placeholder: 'First names' },
  { role: 'Groom & Bride', placeholder: 'First names' },
];

export const SPEECH_DEFAULTS = [
  { role: "Groom's Father" },
  { role: "Bride's Father" },
  { role: 'Maid of Honor' },
  { role: 'Best Man' },
  { role: 'Bride & Groom' },
];

export const MAIN_EVENT_MOMENTS = [
  "Groom's Parents Entry",
  "Bride's Parents Entry",
  'Bridal Party Entry',
  'Bride & Groom Entry',
  'Cutting of the Cake',
  'Bridal Dance',
  'Father & Daughter Dance',
  'Mother & Son Dance',
  'Garter Toss',
  'Flower Toss',
  'Farewell Arch or Circle',
];

// Section definitions with instructions
export const SECTION_DEFINITIONS = [
  {
    label: 'Ceremony Music',
    sort_index: 0,
    instructions: 'Choose songs for each moment of your ceremony. Add YouTube or Spotify links.',
    defaultItems: CEREMONY_MUSIC_MOMENTS.map((moment, i) => ({
      type: 'song' as ItemType,
      data: { moment, song_title: '', artist: '', link: '' } as SongData,
      sort_index: i,
    })),
  },
  {
    label: 'Bridal Party Introductions',
    sort_index: 1,
    instructions: 'List names in order of introduction. You can add pronunciation guides and drag to reorder.',
    defaultItems: BRIDAL_PARTY_DEFAULTS.map((item, i) => ({
      type: 'name' as ItemType,
      data: { role: item.role, names: '', pronunciation: '' } as NameData,
      sort_index: i,
    })),
  },
  {
    label: 'Speeches',
    sort_index: 2,
    instructions: 'List speakers in order. Keep speeches to 3-5 minutes each.',
    defaultItems: SPEECH_DEFAULTS.map((item, i) => ({
      type: 'speech' as ItemType,
      data: { order: i + 1, name: '', role: item.role, notes: '' } as SpeechData,
      sort_index: i,
    })),
  },
  {
    label: 'Cocktail Hour Music',
    sort_index: 3,
    instructions: 'Add songs to play during cocktail hour while guests mingle.',
    defaultItems: [],
  },
  {
    label: 'Main Event Songs',
    sort_index: 4,
    instructions: 'Choose songs for key reception moments. Click on any moment name to edit it.',
    defaultItems: MAIN_EVENT_MOMENTS.map((moment, i) => ({
      type: 'song' as ItemType,
      data: { moment, song_title: '', artist: '', link: '' } as SongData,
      sort_index: i,
    })),
  },
  {
    label: 'Background / Dinner Music',
    sort_index: 5,
    instructions: 'Add songs for dinner service and background ambiance.',
    defaultItems: [],
  },
  {
    label: 'Dance Music',
    sort_index: 6,
    instructions: 'Add songs to get your guests dancing!',
    defaultItems: [],
  },
  {
    label: 'Traditional / Multicultural Music 1',
    sort_index: 7,
    instructions: 'Add songs that celebrate your cultural heritage (e.g., Italian Music).',
    defaultItems: [],
  },
  {
    label: 'Traditional / Multicultural Music 2',
    sort_index: 8,
    instructions: 'Add songs that celebrate your cultural heritage (e.g., Indian Music).',
    defaultItems: [],
  },
  {
    label: 'Do Not Play List',
    sort_index: 9,
    instructions: 'List any songs or genres you do NOT want played.',
    defaultItems: [],
  },
];

export interface NotificationSettings {
  resend_api_key: string | null;
  from_email: string | null;
  email_enabled: boolean;
  sms_provider: string | null;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_messaging_service_sid: string | null;
  sms_enabled: boolean;
}
