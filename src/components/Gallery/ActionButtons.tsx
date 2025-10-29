import React from 'react';
import { Upload, MessageSquare, Mic, ImageIcon } from 'lucide-react';

interface GallerySettings {
  allow_photos: boolean;
  allow_videos: boolean;
  allow_audio: boolean;
  allow_guestbook: boolean;
}

interface ActionButtonsProps {
  onAction: (action: 'upload' | 'guestbook' | 'voice' | 'gallery') => void;
  settings: GallerySettings;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onAction, settings }) => {
  const buttons = [
    { 
      id: 'upload' as const, 
      icon: Upload, 
      label: 'Upload Media',
      enabled: settings.allow_photos || settings.allow_videos
    },
    { 
      id: 'guestbook' as const, 
      icon: MessageSquare, 
      label: 'Sign Guestbook',
      enabled: settings.allow_guestbook
    },
    { 
      id: 'voice' as const, 
      icon: Mic, 
      label: 'Record Message',
      enabled: settings.allow_audio
    },
    { 
      id: 'gallery' as const, 
      icon: ImageIcon, 
      label: 'View Gallery',
      enabled: true // Always enabled
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4">
      {buttons.filter(btn => btn.enabled).map(btn => (
        <button
          key={btn.id}
          onClick={() => onAction(btn.id)}
          className="bg-[#6D28D9] text-white w-full py-6 rounded-xl flex items-center justify-center gap-4 text-lg font-semibold shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]"
        >
          <btn.icon className="w-6 h-6" />
          {btn.label}
        </button>
      ))}
    </div>
  );
};
