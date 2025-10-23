import { TemplateType, ItemType } from '@/types/djQuestionnaire';

export interface TemplateSection {
  label: string;
  instructions: string;
  sort_index: number;
  items: TemplateItem[];
}

export interface TemplateItem {
  type: ItemType;
  prompt: string;
  help_text?: string;
  required: boolean;
  sort_index: number;
  meta?: Record<string, any>;
}

export const DJ_TEMPLATES: Record<TemplateType, TemplateSection[]> = {
  wedding_mr_mrs: [
    {
      label: "Event Details",
      instructions: "Please provide basic information about your wedding",
      sort_index: 0,
      items: [
        { type: "name", prompt: "Bride's Full Name", required: true, sort_index: 0 },
        { type: "name", prompt: "Groom's Full Name", required: true, sort_index: 1 },
        { type: "time", prompt: "Ceremony Start Time", required: true, sort_index: 2 },
        { type: "time", prompt: "Reception Start Time", required: true, sort_index: 3 },
        { type: "time", prompt: "Event End Time", required: true, sort_index: 4 },
        { type: "text", prompt: "Number of Guests", required: true, sort_index: 5 },
      ]
    },
    {
      label: "Music Preferences",
      instructions: "Tell us about your music preferences for the reception",
      sort_index: 1,
      items: [
        { type: "song", prompt: "First Dance Song", help_text: "Artist - Song Title", required: true, sort_index: 0 },
        { type: "song", prompt: "Father-Daughter Dance", help_text: "Artist - Song Title", required: false, sort_index: 1 },
        { type: "song", prompt: "Mother-Son Dance", help_text: "Artist - Song Title", required: false, sort_index: 2 },
        { type: "song", prompt: "Bridal Party Entrance Song", required: false, sort_index: 3 },
        { type: "song", prompt: "Cake Cutting Song", required: false, sort_index: 4 },
        { type: "list", prompt: "Must Play Songs", help_text: "Songs you definitely want played", meta: { maxRows: 15 }, required: false, sort_index: 5 },
        { type: "list", prompt: "Do Not Play Songs", help_text: "Songs to avoid", meta: { maxRows: 15 }, required: false, sort_index: 6 },
        { type: "longtext", prompt: "Preferred Music Genres", help_text: "e.g., Pop, Rock, Country, Hip-Hop", required: false, sort_index: 7 },
        { type: "toggle", prompt: "Allow DJ to take requests from guests?", required: false, sort_index: 8 },
      ]
    },
    {
      label: "Timeline & Special Moments",
      instructions: "Help us plan the evening's schedule",
      sort_index: 2,
      items: [
        { type: "time", prompt: "Grand Entrance Time", required: false, sort_index: 0 },
        { type: "time", prompt: "First Dance Time", required: false, sort_index: 1 },
        { type: "time", prompt: "Dinner Service Time", required: false, sort_index: 2 },
        { type: "time", prompt: "Toasts/Speeches Time", required: false, sort_index: 3 },
        { type: "time", prompt: "Cake Cutting Time", required: false, sort_index: 4 },
        { type: "time", prompt: "Bouquet Toss Time", required: false, sort_index: 5 },
        { type: "time", prompt: "Garter Toss Time", required: false, sort_index: 6 },
        { type: "longtext", prompt: "Other Special Moments or Traditions", required: false, sort_index: 7 },
      ]
    },
    {
      label: "Contact Information",
      instructions: "Primary contacts for day-of coordination",
      sort_index: 3,
      items: [
        { type: "name", prompt: "Wedding Coordinator Name", required: false, sort_index: 0 },
        { type: "phone", prompt: "Coordinator Phone", required: false, sort_index: 1 },
        { type: "email", prompt: "Coordinator Email", required: false, sort_index: 2 },
        { type: "name", prompt: "Best Man Name", required: false, sort_index: 3 },
        { type: "phone", prompt: "Best Man Phone", required: false, sort_index: 4 },
        { type: "name", prompt: "Maid of Honor Name", required: false, sort_index: 5 },
        { type: "phone", prompt: "Maid of Honor Phone", required: false, sort_index: 6 },
      ]
    },
    {
      label: "Additional Notes",
      instructions: "Anything else we should know?",
      sort_index: 4,
      items: [
        { type: "longtext", prompt: "Special Announcements", help_text: "Birthdays, anniversaries, etc.", required: false, sort_index: 0 },
        { type: "longtext", prompt: "Equipment Setup Notes", help_text: "Any specific setup requirements?", required: false, sort_index: 1 },
        { type: "longtext", prompt: "Additional Requests or Comments", required: false, sort_index: 2 },
      ]
    }
  ],
  wedding_mr_mr: [
    {
      label: "Event Details",
      instructions: "Please provide basic information about your wedding",
      sort_index: 0,
      items: [
        { type: "name", prompt: "Partner 1 Full Name", required: true, sort_index: 0 },
        { type: "name", prompt: "Partner 2 Full Name", required: true, sort_index: 1 },
        { type: "time", prompt: "Ceremony Start Time", required: true, sort_index: 2 },
        { type: "time", prompt: "Reception Start Time", required: true, sort_index: 3 },
        { type: "time", prompt: "Event End Time", required: true, sort_index: 4 },
        { type: "text", prompt: "Number of Guests", required: true, sort_index: 5 },
      ]
    },
    {
      label: "Music Preferences",
      instructions: "Tell us about your music preferences for the reception",
      sort_index: 1,
      items: [
        { type: "song", prompt: "First Dance Song", help_text: "Artist - Song Title", required: true, sort_index: 0 },
        { type: "song", prompt: "Bridal Party Entrance Song", required: false, sort_index: 1 },
        { type: "song", prompt: "Cake Cutting Song", required: false, sort_index: 2 },
        { type: "list", prompt: "Must Play Songs", help_text: "Songs you definitely want played", meta: { maxRows: 15 }, required: false, sort_index: 3 },
        { type: "list", prompt: "Do Not Play Songs", help_text: "Songs to avoid", meta: { maxRows: 15 }, required: false, sort_index: 4 },
        { type: "longtext", prompt: "Preferred Music Genres", help_text: "e.g., Pop, Rock, Electronic, Classic", required: false, sort_index: 5 },
        { type: "toggle", prompt: "Allow DJ to take requests from guests?", required: false, sort_index: 6 },
      ]
    },
    {
      label: "Timeline & Special Moments",
      instructions: "Help us plan the evening's schedule",
      sort_index: 2,
      items: [
        { type: "time", prompt: "Grand Entrance Time", required: false, sort_index: 0 },
        { type: "time", prompt: "First Dance Time", required: false, sort_index: 1 },
        { type: "time", prompt: "Dinner Service Time", required: false, sort_index: 2 },
        { type: "time", prompt: "Toasts/Speeches Time", required: false, sort_index: 3 },
        { type: "time", prompt: "Cake Cutting Time", required: false, sort_index: 4 },
        { type: "longtext", prompt: "Other Special Moments or Traditions", required: false, sort_index: 5 },
      ]
    },
    {
      label: "Contact Information",
      instructions: "Primary contacts for day-of coordination",
      sort_index: 3,
      items: [
        { type: "name", prompt: "Wedding Coordinator Name", required: false, sort_index: 0 },
        { type: "phone", prompt: "Coordinator Phone", required: false, sort_index: 1 },
        { type: "email", prompt: "Coordinator Email", required: false, sort_index: 2 },
        { type: "name", prompt: "Best Man Name", required: false, sort_index: 3 },
        { type: "phone", prompt: "Best Man Phone", required: false, sort_index: 4 },
      ]
    },
    {
      label: "Additional Notes",
      instructions: "Anything else we should know?",
      sort_index: 4,
      items: [
        { type: "longtext", prompt: "Special Announcements", help_text: "Birthdays, anniversaries, etc.", required: false, sort_index: 0 },
        { type: "longtext", prompt: "Equipment Setup Notes", help_text: "Any specific setup requirements?", required: false, sort_index: 1 },
        { type: "longtext", prompt: "Additional Requests or Comments", required: false, sort_index: 2 },
      ]
    }
  ],
  wedding_mrs_mrs: [
    {
      label: "Event Details",
      instructions: "Please provide basic information about your wedding",
      sort_index: 0,
      items: [
        { type: "name", prompt: "Partner 1 Full Name", required: true, sort_index: 0 },
        { type: "name", prompt: "Partner 2 Full Name", required: true, sort_index: 1 },
        { type: "time", prompt: "Ceremony Start Time", required: true, sort_index: 2 },
        { type: "time", prompt: "Reception Start Time", required: true, sort_index: 3 },
        { type: "time", prompt: "Event End Time", required: true, sort_index: 4 },
        { type: "text", prompt: "Number of Guests", required: true, sort_index: 5 },
      ]
    },
    {
      label: "Music Preferences",
      instructions: "Tell us about your music preferences for the reception",
      sort_index: 1,
      items: [
        { type: "song", prompt: "First Dance Song", help_text: "Artist - Song Title", required: true, sort_index: 0 },
        { type: "song", prompt: "Bridal Party Entrance Song", required: false, sort_index: 1 },
        { type: "song", prompt: "Cake Cutting Song", required: false, sort_index: 2 },
        { type: "list", prompt: "Must Play Songs", help_text: "Songs you definitely want played", meta: { maxRows: 15 }, required: false, sort_index: 3 },
        { type: "list", prompt: "Do Not Play Songs", help_text: "Songs to avoid", meta: { maxRows: 15 }, required: false, sort_index: 4 },
        { type: "longtext", prompt: "Preferred Music Genres", help_text: "e.g., Pop, Rock, R&B, Dance", required: false, sort_index: 5 },
        { type: "toggle", prompt: "Allow DJ to take requests from guests?", required: false, sort_index: 6 },
      ]
    },
    {
      label: "Timeline & Special Moments",
      instructions: "Help us plan the evening's schedule",
      sort_index: 2,
      items: [
        { type: "time", prompt: "Grand Entrance Time", required: false, sort_index: 0 },
        { type: "time", prompt: "First Dance Time", required: false, sort_index: 1 },
        { type: "time", prompt: "Dinner Service Time", required: false, sort_index: 2 },
        { type: "time", prompt: "Toasts/Speeches Time", required: false, sort_index: 3 },
        { type: "time", prompt: "Cake Cutting Time", required: false, sort_index: 4 },
        { type: "longtext", prompt: "Other Special Moments or Traditions", required: false, sort_index: 5 },
      ]
    },
    {
      label: "Contact Information",
      instructions: "Primary contacts for day-of coordination",
      sort_index: 3,
      items: [
        { type: "name", prompt: "Wedding Coordinator Name", required: false, sort_index: 0 },
        { type: "phone", prompt: "Coordinator Phone", required: false, sort_index: 1 },
        { type: "email", prompt: "Coordinator Email", required: false, sort_index: 2 },
        { type: "name", prompt: "Maid of Honor Name", required: false, sort_index: 3 },
        { type: "phone", prompt: "Maid of Honor Phone", required: false, sort_index: 4 },
      ]
    },
    {
      label: "Additional Notes",
      instructions: "Anything else we should know?",
      sort_index: 4,
      items: [
        { type: "longtext", prompt: "Special Announcements", help_text: "Birthdays, anniversaries, etc.", required: false, sort_index: 0 },
        { type: "longtext", prompt: "Equipment Setup Notes", help_text: "Any specific setup requirements?", required: false, sort_index: 1 },
        { type: "longtext", prompt: "Additional Requests or Comments", required: false, sort_index: 2 },
      ]
    }
  ],
  event_general: [
    {
      label: "Event Details",
      instructions: "Please provide basic information about your event",
      sort_index: 0,
      items: [
        { type: "text", prompt: "Event Name", required: true, sort_index: 0 },
        { type: "text", prompt: "Event Type", help_text: "e.g., Birthday, Corporate, Anniversary", required: true, sort_index: 1 },
        { type: "time", prompt: "Event Start Time", required: true, sort_index: 2 },
        { type: "time", prompt: "Event End Time", required: true, sort_index: 3 },
        { type: "text", prompt: "Expected Number of Guests", required: true, sort_index: 4 },
      ]
    },
    {
      label: "Music & Entertainment",
      instructions: "Tell us about your music preferences",
      sort_index: 1,
      items: [
        { type: "longtext", prompt: "Preferred Music Genres", help_text: "e.g., Top 40, Jazz, Classical", required: false, sort_index: 0 },
        { type: "list", prompt: "Must Play Songs", help_text: "Songs you definitely want played", meta: { maxRows: 15 }, required: false, sort_index: 1 },
        { type: "list", prompt: "Do Not Play Songs", help_text: "Songs to avoid", meta: { maxRows: 15 }, required: false, sort_index: 2 },
        { type: "toggle", prompt: "Allow DJ to take requests from guests?", required: false, sort_index: 3 },
        { type: "longtext", prompt: "Special Entertainment Requests", required: false, sort_index: 4 },
      ]
    },
    {
      label: "Event Timeline",
      instructions: "Help us plan the event schedule",
      sort_index: 2,
      items: [
        { type: "time", prompt: "Speeches/Toasts Time", required: false, sort_index: 0 },
        { type: "time", prompt: "Cake Cutting Time", required: false, sort_index: 1 },
        { type: "longtext", prompt: "Other Scheduled Activities", required: false, sort_index: 2 },
      ]
    },
    {
      label: "Contact Information",
      instructions: "Primary contacts for day-of coordination",
      sort_index: 3,
      items: [
        { type: "name", prompt: "Event Coordinator Name", required: false, sort_index: 0 },
        { type: "phone", prompt: "Coordinator Phone", required: false, sort_index: 1 },
        { type: "email", prompt: "Coordinator Email", required: false, sort_index: 2 },
      ]
    },
    {
      label: "Additional Notes",
      instructions: "Anything else we should know?",
      sort_index: 4,
      items: [
        { type: "longtext", prompt: "Special Announcements", required: false, sort_index: 0 },
        { type: "longtext", prompt: "Equipment Setup Notes", required: false, sort_index: 1 },
        { type: "longtext", prompt: "Additional Requests or Comments", required: false, sort_index: 2 },
      ]
    }
  ]
};

export const getTemplateLabel = (type: TemplateType): string => {
  switch (type) {
    case 'wedding_mr_mrs':
      return 'Wedding (Mr & Mrs)';
    case 'wedding_mr_mr':
      return 'Wedding (Mr & Mr)';
    case 'wedding_mrs_mrs':
      return 'Wedding (Mrs & Mrs)';
    case 'event_general':
      return 'General Event';
  }
};
