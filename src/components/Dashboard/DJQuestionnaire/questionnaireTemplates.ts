import { TemplateType } from '@/hooks/useDJQuestionnaire';

export interface QuestionnaireQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'time';
  placeholder?: string;
  required?: boolean;
}

export const QUESTIONNAIRE_TEMPLATES: Record<TemplateType, QuestionnaireQuestion[]> = {
  wedding_mr_mrs: [
    { id: 'groom_name', label: "Groom's Full Name", type: 'text', required: true },
    { id: 'bride_name', label: "Bride's Full Name", type: 'text', required: true },
    { id: 'wedding_date', label: 'Wedding Date', type: 'text', required: true },
    { id: 'ceremony_time', label: 'Ceremony Time', type: 'time', required: true },
    { id: 'reception_time', label: 'Reception Start Time', type: 'time', required: true },
    { id: 'first_dance_song', label: 'First Dance Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'father_daughter_dance', label: 'Father-Daughter Dance Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'mother_son_dance', label: 'Mother-Son Dance Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'bridal_party_entrance', label: 'Bridal Party Entrance Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'couple_entrance', label: 'Couple Grand Entrance Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'cake_cutting', label: 'Cake Cutting Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'must_play_songs', label: 'Must Play Songs', type: 'textarea', placeholder: 'List your must-play songs (one per line)' },
    { id: 'do_not_play', label: 'Do Not Play List', type: 'textarea', placeholder: 'Songs or genres to avoid' },
    { id: 'special_announcements', label: 'Special Announcements', type: 'textarea', placeholder: 'Birthdays, anniversaries, special guests, etc.' },
    { id: 'reception_timeline', label: 'Reception Timeline & Key Moments', type: 'textarea', placeholder: 'E.g., Toasts at 7pm, Bouquet toss at 9pm' },
    { id: 'special_requests', label: 'Special Requests or Notes', type: 'textarea', placeholder: 'Any additional information for your DJ/MC' },
  ],
  wedding_mr_mr: [
    { id: 'partner1_name', label: "First Partner's Full Name", type: 'text', required: true },
    { id: 'partner2_name', label: "Second Partner's Full Name", type: 'text', required: true },
    { id: 'wedding_date', label: 'Wedding Date', type: 'text', required: true },
    { id: 'ceremony_time', label: 'Ceremony Time', type: 'time', required: true },
    { id: 'reception_time', label: 'Reception Start Time', type: 'time', required: true },
    { id: 'first_dance_song', label: 'First Dance Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'parent_dances', label: 'Parent Dance Songs (if applicable)', type: 'textarea', placeholder: 'List any parent dances and songs' },
    { id: 'bridal_party_entrance', label: 'Wedding Party Entrance Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'couple_entrance', label: 'Couple Grand Entrance Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'cake_cutting', label: 'Cake Cutting Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'must_play_songs', label: 'Must Play Songs', type: 'textarea', placeholder: 'List your must-play songs (one per line)' },
    { id: 'do_not_play', label: 'Do Not Play List', type: 'textarea', placeholder: 'Songs or genres to avoid' },
    { id: 'special_announcements', label: 'Special Announcements', type: 'textarea', placeholder: 'Birthdays, anniversaries, special guests, etc.' },
    { id: 'reception_timeline', label: 'Reception Timeline & Key Moments', type: 'textarea', placeholder: 'E.g., Toasts at 7pm, Bouquet toss at 9pm' },
    { id: 'special_requests', label: 'Special Requests or Notes', type: 'textarea', placeholder: 'Any additional information for your DJ/MC' },
  ],
  wedding_mrs_mrs: [
    { id: 'partner1_name', label: "First Partner's Full Name", type: 'text', required: true },
    { id: 'partner2_name', label: "Second Partner's Full Name", type: 'text', required: true },
    { id: 'wedding_date', label: 'Wedding Date', type: 'text', required: true },
    { id: 'ceremony_time', label: 'Ceremony Time', type: 'time', required: true },
    { id: 'reception_time', label: 'Reception Start Time', type: 'time', required: true },
    { id: 'first_dance_song', label: 'First Dance Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'parent_dances', label: 'Parent Dance Songs (if applicable)', type: 'textarea', placeholder: 'List any parent dances and songs' },
    { id: 'bridal_party_entrance', label: 'Wedding Party Entrance Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'couple_entrance', label: 'Couple Grand Entrance Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'cake_cutting', label: 'Cake Cutting Song', type: 'text', placeholder: 'Artist - Song Title' },
    { id: 'must_play_songs', label: 'Must Play Songs', type: 'textarea', placeholder: 'List your must-play songs (one per line)' },
    { id: 'do_not_play', label: 'Do Not Play List', type: 'textarea', placeholder: 'Songs or genres to avoid' },
    { id: 'special_announcements', label: 'Special Announcements', type: 'textarea', placeholder: 'Birthdays, anniversaries, special guests, etc.' },
    { id: 'reception_timeline', label: 'Reception Timeline & Key Moments', type: 'textarea', placeholder: 'E.g., Toasts at 7pm, Bouquet toss at 9pm' },
    { id: 'special_requests', label: 'Special Requests or Notes', type: 'textarea', placeholder: 'Any additional information for your DJ/MC' },
  ],
  events: [
    { id: 'event_name', label: 'Event Name', type: 'text', required: true },
    { id: 'event_type', label: 'Event Type', type: 'text', placeholder: 'Birthday, Corporate, Anniversary, etc.', required: true },
    { id: 'event_date', label: 'Event Date', type: 'text', required: true },
    { id: 'event_start_time', label: 'Event Start Time', type: 'time', required: true },
    { id: 'event_end_time', label: 'Event End Time', type: 'time' },
    { id: 'guest_of_honor', label: 'Guest of Honor (if applicable)', type: 'text' },
    { id: 'music_style', label: 'Preferred Music Style/Genre', type: 'textarea', placeholder: 'Pop, Rock, Jazz, Classical, etc.' },
    { id: 'must_play_songs', label: 'Must Play Songs', type: 'textarea', placeholder: 'List your must-play songs (one per line)' },
    { id: 'do_not_play', label: 'Do Not Play List', type: 'textarea', placeholder: 'Songs or genres to avoid' },
    { id: 'special_moments', label: 'Key Moments to Announce', type: 'textarea', placeholder: 'Speeches, cake cutting, toasts, presentations, etc.' },
    { id: 'event_timeline', label: 'Event Timeline', type: 'textarea', placeholder: 'Schedule of activities throughout the event' },
    { id: 'special_requests', label: 'Special Requests or Notes', type: 'textarea', placeholder: 'Any additional information for your DJ/MC' },
  ],
};

export const getTemplateLabel = (templateType: TemplateType): string => {
  const labels: Record<TemplateType, string> = {
    wedding_mr_mrs: 'Wedding Questionnaire – Mr & Mrs',
    wedding_mr_mr: 'Wedding Questionnaire – Mr & Mr',
    wedding_mrs_mrs: 'Wedding Questionnaire – Mrs & Mrs',
    events: 'Events Questionnaire',
  };
  return labels[templateType];
};
