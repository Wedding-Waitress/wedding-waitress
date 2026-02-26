import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { TextZone } from '@/hooks/useInvitationTemplates';
import { loadGoogleFont } from '@/lib/googleFonts';
import type { QrConfig } from '@/lib/invitationQR';

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
  qrConfig?: QrConfig;
  qrDataUrl?: string;
  onQrConfigChange?: (config: QrConfig) => void;
}

export const InvitationPreview: React.FC<Props> = ({
  backgroundUrl,
  orientation,
  textZones,
  customText,
  customStyles,
  eventData = {},
  className = '',
  qrConfig,
  qrDataUrl,
  onQrConfigChange,
}) => {
  const isPortrait = orientation === 'portrait';
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!qrConfig?.enabled || !onQrConfigChange) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  }, [qrConfig, onQrConfigChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current || !qrConfig || !onQrConfigChange) return;
    const rect = containerRef.current.getBoundingClientRect();
    const halfSize = qrConfig.size_percent / 2;
    const x = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, halfSize), 100 - halfSize);
    const y = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, halfSize), 100 - halfSize);
    onQrConfigChange({ ...qrConfig, x_percent: Math.round(x * 10) / 10, y_percent: Math.round(y * 10) / 10 });
  }, [dragging, qrConfig, onQrConfigChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl shadow-lg border ${className}`}
      style={{ aspectRatio: isPortrait ? '148/210' : '210/148' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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

      {/* Draggable QR Code Overlay */}
      {qrConfig?.enabled && qrDataUrl && (
        <img
          src={qrDataUrl}
          alt="Event QR code"
          className={`absolute cursor-grab select-none border-2 rounded ${
            dragging ? 'border-primary cursor-grabbing' : 'border-transparent hover:border-dashed hover:border-primary/50'
          }`}
          style={{
            left: `${qrConfig.x_percent - qrConfig.size_percent / 2}%`,
            top: `${qrConfig.y_percent - qrConfig.size_percent / 2}%`,
            width: `${qrConfig.size_percent}%`,
          }}
          onPointerDown={handlePointerDown}
          draggable={false}
        />
      )}
    </div>
  );
};
