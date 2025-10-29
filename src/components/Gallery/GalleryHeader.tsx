import React from 'react';

interface Event {
  name: string;
  date: string;
  partner1_name: string | null;
  partner2_name: string | null;
}

interface GalleryHeaderProps {
  event: Event | null;
}

export const GalleryHeader: React.FC<GalleryHeaderProps> = ({ event }) => {
  return (
    <div className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a 
            href="https://weddingwaitress.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <img 
              src="/wedding-waitress-logo.png" 
              alt="Wedding Waitress" 
              className="h-8 w-auto"
            />
          </a>
          
          {/* Event Info */}
          {event && (
            <div className="flex-1 text-center px-4 min-w-0">
              <h1 className="text-lg font-bold text-[#6D28D9] truncate">
                {event.partner1_name && event.partner2_name
                  ? `${event.partner1_name} & ${event.partner2_name}`
                  : event.name
                }
              </h1>
              <p className="text-xs text-muted-foreground">
                {new Date(event.date).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
