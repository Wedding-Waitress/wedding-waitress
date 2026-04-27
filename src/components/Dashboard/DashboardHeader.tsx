import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import { Sparkles } from 'lucide-react';
import { useSidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export const DashboardHeader: React.FC = () => {
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();

  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (profile?.email) {
      return profile.email.split('@')[0];
    }
    return 'User';
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full border-b border-border bg-card print:hidden safe-area-top">
      <div className={`relative flex items-center px-3 sm:px-4 md:px-6 ${isMobile ? 'h-14' : 'h-10'}`}>
        {/* Mobile: Show greeting on left */}
        {isMobile && (
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-5 h-5 flex-shrink-0 text-primary" />
            <span className="text-base font-medium text-primary truncate">
              Hey {getDisplayName()}!
            </span>
          </div>
        )}
        
        {/* Desktop: Centered welcome message */}
        {!isMobile && (
          <div className="hidden sm:flex items-center justify-center w-full pr-16 lg:pr-0">
            <h2 className="text-xs sm:text-xs md:text-sm lg:text-base font-semibold flex items-center gap-1 sm:gap-2 text-primary">
              <span className="hidden sm:inline">Hey {getDisplayName()}, </span>
              <span className="hidden sm:inline">what are you working on today!</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 flex-shrink-0 text-primary" />
            </h2>
          </div>
        )}
        
        {/* Mobile right side: hamburger only */}
        {isMobile && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="h-12 w-12 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1.5 p-2 transition-all hover:shadow-xl active:scale-95 touch-target bg-primary"
              aria-label="Toggle menu"
            >
              <div className="w-6 h-0.5 bg-white rounded-sm" />
              <div className="w-6 h-0.5 bg-white rounded-sm" />
              <div className="w-6 h-0.5 bg-white rounded-sm" />
            </button>
          </div>
        )}

        {/* Desktop right side: sidebar trigger only */}
        {!isMobile && (
          <div className="absolute right-2 sm:right-4 flex items-center gap-3">
            <SidebarTrigger />
          </div>
        )}
      </div>
    </header>
  );
};