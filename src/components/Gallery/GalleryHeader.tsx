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
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="w-full py-6 px-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Logo */}
          <a 
            href="https://weddingwaitress.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <img 
              src="/wedding-waitress-logo-full-hq.png" 
              alt="Wedding Waitress" 
              className="h-16 w-auto"
            />
          </a>
          
          {/* Event Info */}
          {event && (
            <div className="text-center">
              <h1 className="text-3xl font-light text-gray-900 tracking-wide uppercase mb-1">
                {event.partner1_name && event.partner2_name
                  ? `${event.partner1_name} & ${event.partner2_name}`
                  : event.name
                }
              </h1>
              <p className="text-sm text-gray-600 font-light">
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
