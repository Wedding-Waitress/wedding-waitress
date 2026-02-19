/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This DJ-MC Questionnaire feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break questionnaire data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
 */
// Types for DJ-MC Questionnaire feature

export type SectionType = 
  | 'ceremony'
  | 'cocktail'
  | 'introductions'
  | 'speeches'
  | 'main_event'
  | 'dinner'
  | 'dance'
  | 'traditional'
  | 'do_not_play';

export interface DJMCItem {
  id: string;
  section_id: string;
  row_label: string;
  value_text: string | null;
  song_title_artist: string | null;
  music_url: string | null;
  pronunciation_audio_url: string | null;
  duration: string | null;
  order_index: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DJMCSection {
  id: string;
  questionnaire_id: string;
  section_type: SectionType;
  section_label: string;
  section_subtitle?: string | null;
  order_index: number;
  notes: string | null;
  is_collapsed: boolean;
  created_at: string;
  updated_at: string;
  items: DJMCItem[];
}

export interface DJMCQuestionnaire {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  sections: DJMCSection[];
}

export interface DJMCShareToken {
  id: string;
  questionnaire_id: string;
  token: string;
  permission: 'view_only' | 'can_edit';
  recipient_name: string | null;
  expires_at: string | null;
  created_at: string;
  last_accessed_at: string | null;
}

// Default template configuration
export interface DefaultSectionTemplate {
  section_type: SectionType;
  section_label: string;
  section_subtitle?: string;
  items: {
    row_label: string;
    has_music_url?: boolean;
    has_pronunciation?: boolean;
    placeholder?: string;
  }[];
}
