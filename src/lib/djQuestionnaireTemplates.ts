import { TemplateType } from '@/types/djQuestionnaire';

export interface TemplateSection {
  label: string;
  instructions: string;
  items: TemplateItem[];
  recommendations?: any;
}

export interface TemplateItem {
  type: string;
  prompt: string;
  help_text?: string;
  required?: boolean;
  meta?: Record<string, any>;
}

export interface Template {
  type: TemplateType;
  sections: TemplateSection[];
}

export const DJ_TEMPLATES: Record<TemplateType, Template> = {
  wedding_mr_mrs: {
    type: 'wedding_mr_mrs',
    sections: [
      {
        label: 'Ceremony Music',
        instructions: 'Songs for the ceremony. Include prelude, processional, signing, and recessional music.',
        recommendations: {
          default_rows: [
            { moment: 'Prelude (Guests Arriving)', song: '', artist: '', link: '' },
            { moment: 'Processional (Wedding Party)', song: '', artist: '', link: '' },
            { moment: 'Bridal Entrance', song: '', artist: '', link: '' },
            { moment: 'Signing of Register', song: '', artist: '', link: '' },
            { moment: 'Recessional (Exit)', song: '', artist: '', link: '' }
          ]
        },
        items: [
          { type: 'ceremony_music_row', prompt: 'Ceremony Moment', help_text: 'Moment, song, artist, and link', meta: { maxRows: 10 } }
        ]
      },
      {
        label: 'Pronunciations',
        instructions: 'Help us pronounce names correctly. Include anyone being introduced or mentioned in speeches.',
        recommendations: {
          default_rows: [
            { name: 'Bride', role: 'Bride', phonetic: '' },
            { name: 'Groom', role: 'Groom', phonetic: '' }
          ]
        },
        items: [
          { type: 'pronunciation_row', prompt: 'Name Pronunciation', help_text: 'Name, role, and phonetic spelling', meta: { maxRows: 20 } }
        ]
      },
      {
        label: 'Bridal Party Introductions',
        instructions: 'List the order you want bridal party introduced. Include names, pronunciations, and optional entrance songs.',
        recommendations: {
          default_rows: [
            { role: 'Parents of the Bride', names: '', pronunciation: '', entranceSong: '', link: '' },
            { role: 'Parents of the Groom', names: '', pronunciation: '', entranceSong: '', link: '' },
            { role: 'Bridesmaids & Groomsmen', names: '', pronunciation: '', entranceSong: '', link: '' }
          ]
        },
        items: [
          { type: 'bridal_party_enhanced_row', prompt: 'Entrance Group', help_text: 'Role/Group, names, pronunciation, entrance song, link', meta: { maxRows: 15 } }
        ]
      },
      {
        label: 'Speeches',
        instructions: "Please list speakers in order. Keep to 3–5 mins each. Include name, role, and any notes.",
        recommendations: {
          default_rows: [
            { order: '1', name: 'Father of the Bride', role: '', notes: '' },
            { order: '2', name: 'Best Man', role: '', notes: '' },
            { order: '3', name: 'Maid of Honor', role: '', notes: '' },
            { order: '4', name: 'The Couple', role: '', notes: '' }
          ]
        },
        items: [
          { type: 'speech_enhanced_row', prompt: 'Speaker', help_text: 'Order, name, role, and notes', meta: { maxRows: 5, minRows: 1 } }
        ]
      },
      {
        label: 'Main Event Songs',
        instructions: "Provide songs for major moments (entrance, first dance, cake cutting, etc.). Add Spotify, Apple Music, or YouTube links.",
        recommendations: {
          default_rows: [
            { moment: 'Grand Entrance', song: '', artist: '', link: '' },
            { moment: 'First Dance', song: '', artist: '', link: '' },
            { moment: 'Father-Daughter Dance', song: '', artist: '', link: '' }
          ]
        },
        items: [
          { type: 'main_event_song_row', prompt: 'Special Moment', help_text: 'Moment, song, artist, and link', required: true, meta: { maxRows: 12 } }
        ]
      },
      {
        label: 'Background / Dinner Music',
        instructions: 'Optional. Up to 20 songs for dinner or canapés. Paste YouTube or Spotify links. Keep it elegant and conversational.',
        recommendations: {
          helper_text: "Think: soft jazz, acoustic, or instrumental tracks. We will fill in if you leave this blank."
        },
        items: [
          { type: 'background_music_row', prompt: 'Background Song', help_text: 'Song, artist, and link', meta: { maxRows: 20 } }
        ]
      },
      {
        label: 'Dance Music',
        instructions: 'Up to 30 must-plays for the dance floor. Paste YouTube or Spotify links for easy reference.',
        recommendations: {
          helper_text: "Pro tip: Add a Do-Not-Play list in the next section for songs or genres to avoid."
        },
        items: [
          { type: 'dance_music_row', prompt: 'Must-Play Song', help_text: 'Song, artist, and link', meta: { maxRows: 30 } }
        ]
      },
      {
        label: 'Traditional / Multicultural Music',
        instructions: 'Optional. Add cultural music blocks with songs. Indicate when to play (e.g., after main course, during dessert).',
        recommendations: {
          helper_text: "Examples: Greek dancing, Italian tarantella, Indian Bollywood, hora, etc."
        },
        items: [
          { type: 'cultural_music_enhanced_row', prompt: 'Cultural Set', help_text: 'Block name, when to play, and songs list', meta: { maxRows: 10 } }
        ]
      },
      {
        label: 'Do not play songs',
        instructions: 'List songs or genres to avoid. Add notes if needed (e.g., "No country music - guests prefer pop/rock").',
        items: [
          { type: 'do_not_play_row', prompt: 'Avoid', help_text: 'Song/genre and notes', meta: { maxRows: 20 } }
        ]
      }
    ]
  },
  wedding_mr_mr: {
    type: 'wedding_mr_mr',
    sections: [
      {
        label: 'Ceremony Music',
        instructions: 'Songs for the ceremony. Include prelude, processional, signing, and recessional music.',
        recommendations: {
          default_rows: [
            { moment: 'Prelude (Guests Arriving)', song: '', artist: '', link: '' },
            { moment: 'Processional (Wedding Party)', song: '', artist: '', link: '' },
            { moment: 'Partner Entrance', song: '', artist: '', link: '' },
            { moment: 'Signing of Register', song: '', artist: '', link: '' },
            { moment: 'Recessional (Exit)', song: '', artist: '', link: '' }
          ]
        },
        items: [
          { type: 'ceremony_music_row', prompt: 'Ceremony Moment', help_text: 'Moment, song, artist, and link', meta: { maxRows: 10 } }
        ]
      },
      {
        label: 'Pronunciations',
        instructions: 'Help us pronounce names correctly. Include anyone being introduced or mentioned in speeches.',
        recommendations: {
          default_rows: [
            { name: 'Partner 1', role: 'Groom', phonetic: '' },
            { name: 'Partner 2', role: 'Groom', phonetic: '' }
          ]
        },
        items: [
          { type: 'pronunciation_row', prompt: 'Name Pronunciation', help_text: 'Name, role, and phonetic spelling', meta: { maxRows: 20 } }
        ]
      },
      {
        label: 'Bridal Party Introductions',
        instructions: 'List the order you want bridal party introduced. Include names, pronunciations, and optional entrance songs.',
        recommendations: {
          default_rows: [
            { role: 'Parents', names: '', pronunciation: '', entranceSong: '', link: '' },
            { role: 'Groomsmen', names: '', pronunciation: '', entranceSong: '', link: '' }
          ]
        },
        items: [
          { type: 'bridal_party_enhanced_row', prompt: 'Entrance Group', help_text: 'Role/Group, names, pronunciation, entrance song, link', meta: { maxRows: 15 } }
        ]
      },
      {
        label: 'Speeches',
        instructions: "Please list speakers in order. Keep to 3–5 mins each. Include name, role, and any notes.",
        recommendations: {
          default_rows: [
            { order: '1', name: 'Parents', role: '', notes: '' },
            { order: '2', name: 'Best Man', role: '', notes: '' },
            { order: '3', name: 'The Couple', role: '', notes: '' }
          ]
        },
        items: [
          { type: 'speech_enhanced_row', prompt: 'Speaker', help_text: 'Order, name, role, and notes', meta: { maxRows: 5, minRows: 1 } }
        ]
      },
      {
        label: 'Main Event Songs',
        instructions: "Provide songs for major moments (entrance, first dance, etc.). Add Spotify, Apple Music, or YouTube links.",
        recommendations: {
          default_rows: [
            { moment: 'Grand Entrance', song: '', artist: '', link: '' },
            { moment: 'First Dance', song: '', artist: '', link: '' }
          ]
        },
        items: [
          { type: 'main_event_song_row', prompt: 'Special Moment', help_text: 'Moment, song, artist, and link', required: true, meta: { maxRows: 12 } }
        ]
      },
      {
        label: 'Background / Dinner Music',
        instructions: 'Optional. Up to 20 songs for dinner or canapés. Paste YouTube or Spotify links. Keep it elegant and conversational.',
        recommendations: {
          helper_text: "Think: soft jazz, acoustic, or instrumental tracks. We will fill in if you leave this blank."
        },
        items: [
          { type: 'background_music_row', prompt: 'Background Song', help_text: 'Song, artist, and link', meta: { maxRows: 20 } }
        ]
      },
      {
        label: 'Dance Music',
        instructions: 'Up to 30 must-plays for the dance floor. Paste YouTube or Spotify links for easy reference.',
        recommendations: {
          helper_text: "Pro tip: Add a Do-Not-Play list in the next section for songs or genres to avoid."
        },
        items: [
          { type: 'dance_music_row', prompt: 'Must-Play Song', help_text: 'Song, artist, and link', meta: { maxRows: 30 } }
        ]
      },
      {
        label: 'Traditional / Multicultural Music',
        instructions: 'Optional. Add cultural music blocks with songs. Indicate when to play (e.g., after main course, during dessert).',
        recommendations: {
          helper_text: "Examples: Greek dancing, Italian tarantella, Indian Bollywood, hora, etc."
        },
        items: [
          { type: 'cultural_music_enhanced_row', prompt: 'Cultural Set', help_text: 'Block name, when to play, and songs list', meta: { maxRows: 10 } }
        ]
      },
      {
        label: 'Do not play songs',
        instructions: 'List songs or genres to avoid. Add notes if needed (e.g., "No country music - guests prefer pop/rock").',
        items: [
          { type: 'do_not_play_row', prompt: 'Avoid', help_text: 'Song/genre and notes', meta: { maxRows: 20 } }
        ]
      }
    ]
  },
  wedding_mrs_mrs: {
    type: 'wedding_mrs_mrs',
    sections: [
      {
        label: 'Ceremony Music',
        instructions: 'Songs for the ceremony. Include prelude, processional, signing, and recessional music.',
        recommendations: {
          default_rows: [
            { moment: 'Prelude (Guests Arriving)', song: '', artist: '', link: '' },
            { moment: 'Processional (Wedding Party)', song: '', artist: '', link: '' },
            { moment: 'Bridal Entrance', song: '', artist: '', link: '' },
            { moment: 'Signing of Register', song: '', artist: '', link: '' },
            { moment: 'Recessional (Exit)', song: '', artist: '', link: '' }
          ]
        },
        items: [
          { type: 'ceremony_music_row', prompt: 'Ceremony Moment', help_text: 'Moment, song, artist, and link', meta: { maxRows: 10 } }
        ]
      },
      {
        label: 'Pronunciations',
        instructions: 'Help us pronounce names correctly. Include anyone being introduced or mentioned in speeches.',
        recommendations: {
          default_rows: [
            { name: 'Partner 1', role: 'Bride', phonetic: '' },
            { name: 'Partner 2', role: 'Bride', phonetic: '' }
          ]
        },
        items: [
          { type: 'pronunciation_row', prompt: 'Name Pronunciation', help_text: 'Name, role, and phonetic spelling', meta: { maxRows: 20 } }
        ]
      },
      {
        label: 'Bridal Party Introductions',
        instructions: 'List the order you want bridal party introduced. Include names, pronunciations, and optional entrance songs.',
        recommendations: {
          default_rows: [
            { role: 'Parents', names: '', pronunciation: '', entranceSong: '', link: '' },
            { role: 'Bridesmaids', names: '', pronunciation: '', entranceSong: '', link: '' }
          ]
        },
        items: [
          { type: 'bridal_party_enhanced_row', prompt: 'Entrance Group', help_text: 'Role/Group, names, pronunciation, entrance song, link', meta: { maxRows: 15 } }
        ]
      },
      {
        label: 'Speeches',
        instructions: "Please list speakers in order. Keep to 3–5 mins each. Include name, role, and any notes.",
        recommendations: {
          default_rows: [
            { order: '1', name: 'Parents', role: '', notes: '' },
            { order: '2', name: 'Maid of Honor', role: '', notes: '' },
            { order: '3', name: 'The Couple', role: '', notes: '' }
          ]
        },
        items: [
          { type: 'speech_enhanced_row', prompt: 'Speaker', help_text: 'Order, name, role, and notes', meta: { maxRows: 5, minRows: 1 } }
        ]
      },
      {
        label: 'Main Event Songs',
        instructions: "Provide songs for major moments (entrance, first dance, etc.). Add Spotify, Apple Music, or YouTube links.",
        recommendations: {
          default_rows: [
            { moment: 'Grand Entrance', song: '', artist: '', link: '' },
            { moment: 'First Dance', song: '', artist: '', link: '' }
          ]
        },
        items: [
          { type: 'main_event_song_row', prompt: 'Special Moment', help_text: 'Moment, song, artist, and link', required: true, meta: { maxRows: 12 } }
        ]
      },
      {
        label: 'Background / Dinner Music',
        instructions: 'Optional. Up to 20 songs for dinner or canapés. Paste YouTube or Spotify links. Keep it elegant and conversational.',
        recommendations: {
          helper_text: "Think: soft jazz, acoustic, or instrumental tracks. We will fill in if you leave this blank."
        },
        items: [
          { type: 'background_music_row', prompt: 'Background Song', help_text: 'Song, artist, and link', meta: { maxRows: 20 } }
        ]
      },
      {
        label: 'Dance Music',
        instructions: 'Up to 30 must-plays for the dance floor. Paste YouTube or Spotify links for easy reference.',
        recommendations: {
          helper_text: "Pro tip: Add a Do-Not-Play list in the next section for songs or genres to avoid."
        },
        items: [
          { type: 'dance_music_row', prompt: 'Must-Play Song', help_text: 'Song, artist, and link', meta: { maxRows: 30 } }
        ]
      },
      {
        label: 'Traditional / Multicultural Music',
        instructions: 'Optional. Add cultural music blocks with songs. Indicate when to play (e.g., after main course, during dessert).',
        recommendations: {
          helper_text: "Examples: Greek dancing, Italian tarantella, Indian Bollywood, hora, etc."
        },
        items: [
          { type: 'cultural_music_enhanced_row', prompt: 'Cultural Set', help_text: 'Block name, when to play, and songs list', meta: { maxRows: 10 } }
        ]
      },
      {
        label: 'Do not play songs',
        instructions: 'List songs or genres to avoid. Add notes if needed (e.g., "No country music - guests prefer pop/rock").',
        items: [
          { type: 'do_not_play_row', prompt: 'Avoid', help_text: 'Song/genre and notes', meta: { maxRows: 20 } }
        ]
      }
    ]
  },
  event_general: {
    type: 'event_general',
    sections: [
      {
        label: 'Event Basics',
        instructions: 'Tell us about your event and primary contacts.',
        items: [
          { type: 'text', prompt: 'Event Type', required: true },
          { type: 'name', prompt: 'Primary Contact Name', required: true }
        ]
      }
    ]
  }
};

export const getTemplateLabel = (type: TemplateType): string => {
  switch (type) {
    case 'wedding_mr_mrs': return 'Wedding (Mr & Mrs)';
    case 'wedding_mr_mr': return 'Wedding (Mr & Mr)';
    case 'wedding_mrs_mrs': return 'Wedding (Mrs & Mrs)';
    case 'event_general': return 'General Event';
  }
};
