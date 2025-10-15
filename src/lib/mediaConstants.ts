/**
 * Constants for Photo & Video Sharing feature
 * Themes, event types, and configuration
 */

export const MEDIA_THEMES = {
  yellow: {
    id: 'yellow',
    name: 'Yellow',
    emoji: '✨',
    bgColor: '#FFE75B',
    pattern: 'confetti',
    textColor: '#111',
  },
  orange: {
    id: 'orange',
    name: 'Orange',
    emoji: '🌅',
    bgColor: '#FFA94D',
    pattern: 'glow',
    textColor: '#111',
  },
  purple: {
    id: 'purple',
    name: 'Purple',
    emoji: '💜',
    bgColor: '#6D28D9',
    pattern: 'ribbons',
    textColor: '#FFFFFF',
  },
  pink: {
    id: 'pink',
    name: 'Pink',
    emoji: '💕',
    bgColor: '#FFC0D9',
    pattern: 'hearts',
    textColor: '#111',
  },
  beach: {
    id: 'beach',
    name: 'Beach',
    emoji: '🏖️',
    bgColor: 'linear-gradient(180deg, #00C6FF 0%, #F0E68C 100%)',
    pattern: 'wave',
    textColor: '#111',
  },
  sky: {
    id: 'sky',
    name: 'Sky',
    emoji: '☁️',
    bgColor: 'linear-gradient(180deg, #87CEEB 0%, #E0F7FF 100%)',
    pattern: 'clouds',
    textColor: '#111',
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
  return MEDIA_THEMES[themeId as MediaThemeId] || MEDIA_THEMES.yellow;
};

export const getThemeStyle = (themeId: string): React.CSSProperties => {
  const theme = getThemeById(themeId);
  const style: React.CSSProperties = {
    background: theme.bgColor,
    color: theme.textColor,
  };

  // Add pattern decorations
  if (theme.pattern === 'confetti') {
    style.backgroundImage = `radial-gradient(circle at 20% 30%, rgba(255, 200, 100, 0.15) 2px, transparent 2px),
                              radial-gradient(circle at 80% 70%, rgba(255, 150, 200, 0.15) 2px, transparent 2px),
                              radial-gradient(circle at 50% 50%, rgba(100, 200, 255, 0.15) 2px, transparent 2px)`;
    style.backgroundSize = '40px 40px';
  } else if (theme.pattern === 'glow') {
    style.background = `radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.3) 0%, ${theme.bgColor} 60%)`;
  } else if (theme.pattern === 'ribbons') {
    style.backgroundImage = `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255, 255, 255, 0.06) 20px, rgba(255, 255, 255, 0.06) 40px)`;
  } else if (theme.pattern === 'hearts') {
    style.backgroundImage = `radial-gradient(circle at 30% 40%, rgba(255, 100, 150, 0.08) 8px, transparent 8px),
                              radial-gradient(circle at 70% 60%, rgba(255, 100, 150, 0.08) 8px, transparent 8px)`;
    style.backgroundSize = '60px 60px';
  } else if (theme.pattern === 'wave') {
    style.backgroundImage = `${theme.bgColor}, url("data:image/svg+xml,%3Csvg width='100' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,10 Q25,5 50,10 T100,10' stroke='rgba(255,255,255,0.3)' fill='none' stroke-width='2'/%3E%3C/svg%3E")`;
    style.backgroundPosition = 'center, bottom';
    style.backgroundRepeat = 'no-repeat, repeat-x';
  } else if (theme.pattern === 'clouds') {
    style.backgroundImage = `${theme.bgColor}, radial-gradient(ellipse at 30% 40%, rgba(255, 255, 255, 0.4) 20px, transparent 50px),
                              radial-gradient(ellipse at 70% 60%, rgba(255, 255, 255, 0.3) 30px, transparent 60px)`;
  }

  return style;
};
