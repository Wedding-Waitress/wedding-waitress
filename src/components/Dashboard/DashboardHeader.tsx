import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import logoImage from '@/assets/wedding-waitress-new-logo.png';
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
  
  return <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 print:hidden">
      <div className="relative flex h-16 items-center px-2 sm:px-4 md:px-6 my-[10px]">
        {/* Logo - centered on mobile, left-aligned on desktop */}
        <div className={cn(
          "flex items-center",
          isMobile ? "flex-1 justify-center" : "absolute left-2 sm:left-4 md:left-6"
        )}>
          <img src={logoImage} alt="Wedding Waitress" className="h-6 sm:h-10 md:h-14 w-auto" />
        </div>
        
        {/* Welcome message - hidden on mobile, centered on desktop */}
        {!isMobile && (
          <div className="flex items-center justify-center w-full">
            <h2 className="text-sm sm:text-base md:text-xl lg:text-2xl font-semibold flex items-center gap-1 sm:gap-2" style={{ color: '#6D28D9' }}>
              <span className="hidden sm:inline">Hey {getDisplayName()}, </span>
              <span className="sm:hidden">{getDisplayName()}</span>
              <span className="hidden sm:inline">What are you working on today!</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 flex-shrink-0" style={{ color: '#6D28D9' }} />
            </h2>
          </div>
        )}
        
        {/* Custom hamburger menu button - mobile only */}
        {isMobile && (
          <div className="absolute right-2">
            <button
              onClick={toggleSidebar}
              className="h-9 w-9 rounded-lg shadow-md flex flex-col items-center justify-center gap-1 p-2"
              style={{ backgroundColor: '#6D28D9' }}
              aria-label="Toggle menu"
            >
              <div className="w-5 h-0.5 bg-white rounded-full"></div>
              <div className="w-5 h-0.5 bg-white rounded-full"></div>
              <div className="w-5 h-0.5 bg-white rounded-full"></div>
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