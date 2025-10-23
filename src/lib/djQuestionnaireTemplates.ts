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
        label: 'Speeches & Toasts',
        instructions: "Please list speakers in order. Keep to 3–5 mins each. You can drag to reorder.",
        recommendations: {
          default_rows: [
            { name: 'Father of the Bride', order: 1 },
            { name: 'Best Man', order: 2 },
            { name: 'Maid of Honor', order: 3 },
            { name: 'The Couple', order: 4 }
          ]
        },
        items: [
          { type: 'speech_row', prompt: 'Speaker', help_text: 'Name and speaking order', meta: { maxRows: 5, minRows: 1 } }
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
        instructions: 'List the order you want bridal party introduced. You can assign an entrance song per group. Drag to reorder as needed.',
        recommendations: {
          default_rows: [
            { group: 'Parents of the Bride', type: 'Parents', song: '' },
            { group: 'Parents of the Groom', type: 'Parents', song: '' },
            { group: 'Bridesmaids & Groomsmen', type: 'Attendants', song: '' }
          ]
        },
        items: [
          { type: 'bridal_party_row', prompt: 'Entrance Group', help_text: 'Group name, type, and entrance song', meta: { maxRows: 15 } }
        ]
      },
      {
        label: 'Background & Dinner Music',
        instructions: 'Optional. Up to 20 songs for dinner or canapés. Paste YouTube or Spotify links. Keep it elegant and conversational.',
        recommendations: {
          helper_text: "Think: soft jazz, acoustic, or instrumental tracks. We will fill in if you leave this blank."
        },
        items: [
          { type: 'song_row', prompt: 'Background Song', help_text: 'Song, artist, and link', meta: { maxRows: 20, showMoment: false } }
        ]
      },
      {
        label: 'Main Event Songs',
        instructions: "Provide songs for major moments. If unsure, leave blank and we'll suggest. Add Spotify, Apple Music, or YouTube links.",
        recommendations: {
          default_rows: [
            { moment: 'Grand Entrance', song: '', artist: '', link: '' },
            { moment: 'First Dance', song: '', artist: '', link: '' },
            { moment: 'Father-Daughter Dance', song: '', artist: '', link: '' }
          ]
        },
        items: [
          { type: 'song_row', prompt: 'Special Moment', help_text: 'Moment, song, artist, and link', required: true, meta: { maxRows: 12, showMoment: true } }
        ]
      },
      {
        label: 'Dance Floor Must-Plays',
        instructions: 'Up to 30 must-plays for the dance floor. Paste YouTube or Spotify links for easy reference.',
        recommendations: {
          helper_text: "Pro tip: Add a Do-Not-Play list in Final Notes for songs or genres to avoid."
        },
        items: [
          { type: 'song_row', prompt: 'Must-Play Song', help_text: 'Song, artist, and link', meta: { maxRows: 30, showMoment: false } }
        ]
      },
      {
        label: 'Cultural & Traditional Sets',
        instructions: 'Optional. Add cultural music sets and indicate when to play (e.g., after main course, during dessert, or on request).',
        recommendations: {
          helper_text: "Examples: Greek dancing, Italian tarantella, Indian Bollywood, hora, etc."
        },
        items: [
          { type: 'cultural_row', prompt: 'Cultural Set', help_text: 'Style/tradition and when to play', meta: { maxRows: 10 } }
        ]
      },
      {
        label: 'Final Notes',
        instructions: 'Anything else we should know? Add special requests, do-not-play lists, guest considerations, or concerns here.',
        items: [
          { type: 'longtext', prompt: 'Additional Notes', help_text: 'Any other information for us' }
        ]
      }
    ]
  },
  wedding_mr_mr: {
    type: 'wedding_mr_mr',
    sections: [
      {
        label: 'Speeches & Toasts',
        instructions: "Please list speakers in order. Keep to 3–5 mins each. You can drag to reorder.",
        recommendations: {
          default_rows: [
            { name: 'Parents', order: 1 },
            { name: 'Best Man', order: 2 },
            { name: 'The Couple', order: 3 }
          ]
        },
        items: [
          { type: 'speech_row', prompt: 'Speaker', help_text: 'Name and speaking order', meta: { maxRows: 5, minRows: 1 } }
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
        instructions: 'List the order you want bridal party introduced. You can assign an entrance song per group. Drag to reorder as needed.',
        recommendations: {
          default_rows: [
            { group: 'Parents', type: 'Parents', song: '' },
            { group: 'Groomsmen', type: 'Attendants', song: '' }
          ]
        },
        items: [
          { type: 'bridal_party_row', prompt: 'Entrance Group', help_text: 'Group name, type, and entrance song', meta: { maxRows: 15 } }
        ]
      },
      {
        label: 'Background & Dinner Music',
        instructions: 'Optional. Up to 20 songs for dinner or canapés. Paste YouTube or Spotify links. Keep it elegant and conversational.',
        recommendations: {
          helper_text: "Think: soft jazz, acoustic, or instrumental tracks. We will fill in if you leave this blank."
        },
        items: [
          { type: 'song_row', prompt: 'Background Song', help_text: 'Song, artist, and link', meta: { maxRows: 20, showMoment: false } }
        ]
      },
      {
        label: 'Main Event Songs',
        instructions: "Provide songs for major moments. If unsure, leave blank and we will suggest. Add Spotify, Apple Music, or YouTube links.",
        recommendations: {
          default_rows: [
            { moment: 'Grand Entrance', song: '', artist: '', link: '' },
            { moment: 'First Dance', song: '', artist: '', link: '' }
          ]
        },
        items: [
          { type: 'song_row', prompt: 'Special Moment', help_text: 'Moment, song, artist, and link', required: true, meta: { maxRows: 12, showMoment: true } }
        ]
      },
      {
        label: 'Dance Floor Must-Plays',
        instructions: 'Up to 30 must-plays for the dance floor. Paste YouTube or Spotify links for easy reference.',
        recommendations: {
          helper_text: "Pro tip: Add a Do-Not-Play list in Final Notes for songs or genres to avoid."
        },
        items: [
          { type: 'song_row', prompt: 'Must-Play Song', help_text: 'Song, artist, and link', meta: { maxRows: 30, showMoment: false } }
        ]
      },
      {
        label: 'Cultural & Traditional Sets',
        instructions: 'Optional. Add cultural music sets and indicate when to play (e.g., after main course, during dessert, or on request).',
        recommendations: {
          helper_text: "Examples: Greek dancing, Italian tarantella, Indian Bollywood, hora, etc."
        },
        items: [
          { type: 'cultural_row', prompt: 'Cultural Set', help_text: 'Style/tradition and when to play', meta: { maxRows: 10 } }
        ]
      },
      {
        label: 'Final Notes',
        instructions: 'Anything else we should know? Add special requests, do-not-play lists, guest considerations, or concerns here.',
        items: [
          { type: 'longtext', prompt: 'Additional Notes', help_text: 'Any other information for us' }
        ]
      }
    ]
  },
  wedding_mrs_mrs: {
    type: 'wedding_mrs_mrs',
    sections: [
      {
        label: 'Speeches & Toasts',
        instructions: "Please list speakers in order. Keep to 3–5 mins each. You can drag to reorder.",
        recommendations: {
          default_rows: [
            { name: 'Parents', order: 1 },
            { name: 'Maid of Honor', order: 2 },
            { name: 'The Couple', order: 3 }
          ]
        },
        items: [
          { type: 'speech_row', prompt: 'Speaker', help_text: 'Name and speaking order', meta: { maxRows: 5, minRows: 1 } }
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
        instructions: 'List the order you want bridal party introduced. You can assign an entrance song per group. Drag to reorder as needed.',
        recommendations: {
          default_rows: [
            { group: 'Parents', type: 'Parents', song: '' },
            { group: 'Bridesmaids', type: 'Attendants', song: '' }
          ]
        },
        items: [
          { type: 'bridal_party_row', prompt: 'Entrance Group', help_text: 'Group name, type, and entrance song', meta: { maxRows: 15 } }
        ]
      },
      {
        label: 'Background & Dinner Music',
        instructions: 'Optional. Up to 20 songs for dinner or canapés. Paste YouTube or Spotify links. Keep it elegant and conversational.',
        recommendations: {
          helper_text: "Think: soft jazz, acoustic, or instrumental tracks. We will fill in if you leave this blank."
        },
        items: [
          { type: 'song_row', prompt: 'Background Song', help_text: 'Song, artist, and link', meta: { maxRows: 20, showMoment: false } }
        ]
      },
      {
        label: 'Main Event Songs',
        instructions: "Provide songs for major moments. If unsure, leave blank and we will suggest. Add Spotify, Apple Music, or YouTube links.",
        recommendations: {
          default_rows: [
            { moment: 'Grand Entrance', song: '', artist: '', link: '' },
            { moment: 'First Dance', song: '', artist: '', link: '' }
          ]
        },
        items: [
          { type: 'song_row', prompt: 'Special Moment', help_text: 'Moment, song, artist, and link', required: true, meta: { maxRows: 12, showMoment: true } }
        ]
      },
      {
        label: 'Dance Floor Must-Plays',
        instructions: 'Up to 30 must-plays for the dance floor. Paste YouTube or Spotify links for easy reference.',
        recommendations: {
          helper_text: "Pro tip: Add a Do-Not-Play list in Final Notes for songs or genres to avoid."
        },
        items: [
          { type: 'song_row', prompt: 'Must-Play Song', help_text: 'Song, artist, and link', meta: { maxRows: 30, showMoment: false } }
        ]
      },
      {
        label: 'Cultural & Traditional Sets',
        instructions: 'Optional. Add cultural music sets and indicate when to play (e.g., after main course, during dessert, or on request).',
        recommendations: {
          helper_text: "Examples: Greek dancing, Italian tarantella, Indian Bollywood, hora, etc."
        },
        items: [
          { type: 'cultural_row', prompt: 'Cultural Set', help_text: 'Style/tradition and when to play', meta: { maxRows: 10 } }
        ]
      },
      {
        label: 'Final Notes',
        instructions: 'Anything else we should know? Add special requests, do-not-play lists, guest considerations, or concerns here.',
        items: [
          { type: 'longtext', prompt: 'Additional Notes', help_text: 'Any other information for us' }
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
