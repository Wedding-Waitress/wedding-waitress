import React from 'react';
import { CloudUpload, BookOpen, Mic, Eye } from 'lucide-react';

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
      icon: CloudUpload, 
      label: 'Upload Media'
    },
    { 
      id: 'guestbook' as const, 
      icon: BookOpen, 
      label: 'Sign Guestbook'
    },
    { 
      id: 'voice' as const, 
      icon: Mic, 
      label: 'Record Message'
    },
    { 
      id: 'gallery' as const, 
      icon: Eye, 
      label: 'View Gallery'
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-8 space-y-4">
      {buttons.map(btn => (
        <button
          key={btn.id}
          onClick={() => onAction(btn.id)}
          className="bg-white text-gray-900 w-full py-5 rounded-2xl flex items-center gap-4 text-base font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.01] transition-all duration-200 active:scale-[0.99] border border-gray-100"
        >
          <btn.icon className="w-6 h-6 ml-6 text-gray-700" />
          <span className="flex-1 text-left">{btn.label}</span>
        </button>
      ))}
    </div>
  );
};
