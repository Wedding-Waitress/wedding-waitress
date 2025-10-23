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
        instructions: "List speakers in the order they will present. We recommend starting with parents and ending with the couple.",
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
        instructions: 'Order of entrances for your bridal party. You can assign different entrance songs per group.',
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
        label: 'Main Event Songs',
        instructions: 'Key songs for special moments. These are typically played at specific times.',
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
        instructions: 'Up to 30 songs that MUST be played on the dance floor.',
        items: [
          { type: 'song_row', prompt: 'Must-Play Song', help_text: 'Song, artist, and link', meta: { maxRows: 30, showMoment: false } }
        ]
      },
      {
        label: 'Final Notes',
        instructions: 'Anything else we should know? Special requests, concerns, or additional details.',
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
        instructions: "List speakers in the order they will present.",
        items: [{ type: 'speech_row', prompt: 'Speaker', meta: { maxRows: 5 } }]
      }
    ]
  },
  wedding_mrs_mrs: {
    type: 'wedding_mrs_mrs',
    sections: [
      {
        label: 'Speeches & Toasts',
        instructions: "List speakers in the order they will present.",
        items: [{ type: 'speech_row', prompt: 'Speaker', meta: { maxRows: 5 } }]
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
