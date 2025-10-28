import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import { Sparkles } from 'lucide-react';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
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
  
  return <header className="relative w-full border-b border-border bg-card print:hidden">
      <div className="relative flex h-20 sm:h-16 items-center px-3 sm:px-4 md:px-6 my-[10px]">
        {/* Welcome message - hidden on mobile, right-aligned on tablet, centered on desktop */}
        {!isMobile && (
          <div className="hidden sm:flex items-center justify-center w-full pr-16 lg:pr-0">
            <h2 className="text-xs sm:text-xs md:text-sm lg:text-base font-semibold flex items-center gap-1 sm:gap-2" style={{ color: '#7C3AED' }}>
              <span className="hidden sm:inline">Hey {getDisplayName()}, </span>
              <span className="hidden sm:inline">What are you working on today!</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 flex-shrink-0" style={{ color: '#7C3AED' }} />
            </h2>
          </div>
        )}
        
        {/* Custom hamburger menu button - mobile only */}
        {isMobile && (
          <div className="absolute right-2 sm:hidden">
            <button
              onClick={toggleSidebar}
              className="h-10 w-10 rounded-lg shadow-lg flex flex-col items-center justify-center gap-1.5 p-2 transition-all hover:shadow-xl active:scale-95"
              style={{ backgroundColor: '#6D28D9' }}
              aria-label="Toggle menu"
            >
              <div className="w-6 h-0.5 bg-white rounded-sm"></div>
              <div className="w-6 h-0.5 bg-white rounded-sm"></div>
              <div className="w-6 h-0.5 bg-white rounded-sm"></div>
            </button>
          </div>
        )}
        
        {/* Original sidebar trigger for desktop */}
        {!isMobile && (
          <div className="absolute right-2 sm:right-4">
            <SidebarTrigger />
          </div>
        )}
      </div>
    </header>;
};