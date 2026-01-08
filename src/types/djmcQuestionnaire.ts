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

// Default template data
export const CEREMONY_MUSIC_MOMENTS = [
  'Prelude (Before Ceremony)',
  'Processional (Bridal Party Entry)',
  'Bride Entry',
  'Interlude (During Ceremony / Signing)',
  'Recessional (Couple Leaving)',
];

export const BRIDAL_PARTY_DEFAULTS = [
  { role: "Groom's Parents", placeholder: 'Full names' },
  { role: "Bride's Parents", placeholder: 'Full names' },
  { role: 'Page Boy & Flower Girl', placeholder: 'First names' },
  { role: 'Groomsmen & Bridesmaids', placeholder: 'First names' },
  { role: 'Groomsmen & Bridesmaids', placeholder: 'First names' },
  { role: 'Groomsmen & Bridesmaids', placeholder: 'First names' },
  { role: 'Best Man & Maid of Honour', placeholder: 'First names' },
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
  'Bridal Party Entrance',
  'Bride & Groom Entrance',
  'Cutting of Cake',
  'Bridal Dance',
  'Father & Daughter Dance',
  'Mother & Son Dance',
  'Garter Toss',
  'Flower Toss',
  'Farewell Arch/Circle',
  'Last Song of the Night',
  'Custom Moment 1',
  'Custom Moment 2',
  'Custom Moment 3',
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
