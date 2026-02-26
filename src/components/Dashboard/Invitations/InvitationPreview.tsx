import React, { useEffect } from 'react';
import type { TextZone } from '@/hooks/useInvitationTemplates';
import { loadGoogleFont } from '@/lib/googleFonts';

interface Props {
  backgroundUrl: string;
  orientation: string;
  textZones: TextZone[];
  customText: Record<string, string>;
  customStyles: Record<string, any>;
  eventData?: {
    couple_names?: string;
    date?: string;
    venue?: string;
    time?: string;
  };
  className?: string;
}

export const InvitationPreview: React.FC<Props> = ({
  backgroundUrl,
  orientation,
  textZones,
  customText,
  customStyles,
  eventData = {},
  className = '',
}) => {
  const isPortrait = orientation === 'portrait';

  // Load all fonts used across text zones
  useEffect(() => {
    textZones.forEach(zone => {
      const overrides = customStyles[zone.id] || {};
      const font = overrides.font_family || zone.font_family;
      if (font) loadGoogleFont(font);
    });
  }, [textZones, customStyles]);

  const getZoneText = (zone: TextZone): string => {
    // Check custom text first
    if (customText[zone.id]) return customText[zone.id];

    // Auto-fill from event data
    if (zone.type === 'auto' && zone.auto_field) {
      const val = eventData[zone.auto_field];
      if (val) return val;
    }

    if (zone.type === 'guest_name') return 'Guest Name';

    return zone.default_text;
  };

  const getZoneStyle = (zone: TextZone) => {
    const overrides = customStyles[zone.id] || {};
    return {
      fontFamily: overrides.font_family || zone.font_family,
      fontSize: `${overrides.font_size || zone.font_size}px`,
      fontWeight: overrides.font_weight || zone.font_weight,
      color: overrides.font_color || zone.font_color,
      textAlign: (overrides.text_align || zone.text_align) as any,
      letterSpacing: `${overrides.letter_spacing ?? zone.letter_spacing}px`,
      lineHeight: 1.3,
    };
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl shadow-lg border ${className}`}
      style={{ aspectRatio: isPortrait ? '148/210' : '210/148' }}
    >
      <img
        src={backgroundUrl}
        alt="Invitation background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {textZones.map(zone => (
        <div
          key={zone.id}
          className="absolute whitespace-pre-wrap"
          style={{
            left: `${zone.x_percent - zone.width_percent / 2}%`,
            top: `${zone.y_percent - 3}%`,
            width: `${zone.width_percent}%`,
            ...getZoneStyle(zone),
          }}
        >
          {getZoneText(zone)}
        </div>
      ))}
    </div>
  );
};
