import { format } from 'date-fns';
import { formatDisplayTime } from './utils';
import { TemplateType, DJQuestionnaireWithData } from '@/types/djQuestionnaire';
import { validateMusicURL, ensureAbsoluteUrl } from './urlValidation';

export interface Event {
  id: string;
  name: string;
  partner1_name?: string;
  partner2_name?: string;
  date?: string;
  venue?: string;
  venue_name?: string;
  start_time?: string;
  finish_time?: string;
}

export const formatEventDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Date TBD';
  try {
    const date = new Date(dateString);
    return format(date, 'EEEE do MMMM yyyy');
  } catch {
    return 'Date TBD';
  }
};

export const getEventName = (event: Event): string => {
  if (event.partner1_name && event.partner2_name) {
    return `${event.partner1_name} & ${event.partner2_name}`;
  }
  return event.name || 'Untitled Event';
};

export const getTemplateDisplayLabel = (type: TemplateType): string => {
  return type === 'event_general' ? 'Events Questionnaire' : 'Wedding Questionnaire';
};

export const formatTimeRange = (start?: string, finish?: string): string => {
  if (!start && !finish) return 'TBD';
  const startFormatted = start ? formatDisplayTime(start) : 'TBD';
  const finishFormatted = finish ? formatDisplayTime(finish) : 'TBD';
  return `${startFormatted}–${finishFormatted}`;
};

export const getCurrentDateTime = () => {
  const now = new Date();
  const date = format(now, 'dd/MM/yyyy');
  const time = format(now, 'HH:mm');
  return { date, time };
};

export interface SongLink {
  sectionLabel: string;
  songTitle: string;
  artist: string;
  url: string;
  platform?: string;
}

/**
 * Extracts all song links from a questionnaire
 */
export const extractAllSongLinks = (questionnaire: DJQuestionnaireWithData): SongLink[] => {
  const links: SongLink[] = [];

  questionnaire.sections.forEach((section) => {
    section.items.forEach((item) => {
      if (item.type === 'song_row' && item.answer?.value?.link) {
        const songData = item.answer.value;
        const validation = validateMusicURL(songData.link);
        
        if (validation.isValid && songData.link) {
          links.push({
            sectionLabel: section.label,
            songTitle: songData.song || '[Untitled]',
            artist: songData.artist || '[Unknown]',
            url: ensureAbsoluteUrl(songData.link),
            platform: validation.platform,
          });
        }
      }
    });
  });

  return links;
};
