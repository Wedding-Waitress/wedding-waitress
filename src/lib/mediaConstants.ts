/**
 * Constants for Photo & Video Sharing feature
 * Themes, event types, and configuration
 */

export const MEDIA_THEMES = {
  confetti: {
    id: 'confetti',
    name: 'Confetti',
    emoji: '🎉',
    bgColor: '#FFE5E5',
    pattern: 'confetti',
    textColor: '#1F2937',
  },
  hearts: {
    id: 'hearts',
    name: 'Hearts',
    emoji: '💕',
    bgColor: '#FFD6E8',
    pattern: 'hearts',
    textColor: '#1F2937',
  },
  stars: {
    id: 'stars',
    name: 'Stars',
    emoji: '⭐',
    bgColor: '#E5F3FF',
    pattern: 'stars',
    textColor: '#1F2937',
  },
  gradient1: {
    id: 'gradient1',
    name: 'Sunset',
    emoji: '🌅',
    bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    pattern: 'gradient',
    textColor: '#FFFFFF',
  },
  gradient2: {
    id: 'gradient2',
    name: 'Ocean',
    emoji: '🌊',
    bgColor: 'linear-gradient(135deg, #667eea 0%, #43e97b 100%)',
    pattern: 'gradient',
    textColor: '#FFFFFF',
  },
  plain: {
    id: 'plain',
    name: 'Plain',
    emoji: '📝',
    bgColor: '#FFFFFF',
    pattern: 'none',
    textColor: '#1F2937',
  },
} as const;

export const EVENT_TYPES = [
  { id: 'wedding', emoji: '💍', label: 'Wedding' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'conference', emoji: '🎤', label: 'Conference' },
  { id: 'birthday', emoji: '🎂', label: 'Birthday' },
  { id: 'other', emoji: '❓', label: 'Other' },
] as const;

export type MediaThemeId = keyof typeof MEDIA_THEMES;
export type EventTypeId = typeof EVENT_TYPES[number]['id'];

export const getThemeById = (themeId: string) => {
  return MEDIA_THEMES[themeId as MediaThemeId] || MEDIA_THEMES.plain;
};
