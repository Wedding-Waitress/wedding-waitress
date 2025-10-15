import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import logoImage from '@/assets/wedding-waitress-new-logo.png';
import { Sparkles } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
export const DashboardHeader: React.FC = () => {
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  
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
      <div className="relative flex h-16 items-center px-4 md:px-6 my-[10px]">
        {/* Logo - absolute positioned far left */}
        <div className="absolute left-4 md:left-6 flex items-center">
          <img src={logoImage} alt="Wedding Waitress" className="h-12 md:h-14 w-auto" />
        </div>
        
        {/* Welcome message - centered */}
        <div className="flex items-center justify-center w-full">
          <h2 className="text-base md:text-xl lg:text-2xl font-semibold flex items-center gap-2" style={{ color: '#6D28D9' }}>
            <span className="hidden sm:inline">Hey {getDisplayName()}, </span>
            <span className="sm:hidden">{getDisplayName()}</span>
            <span className="hidden sm:inline">What are you working on today!</span>
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 flex-shrink-0" style={{ color: '#6D28D9' }} />
          </h2>
        </div>
        
        {/* Mobile hamburger - absolute positioned */}
        {isMobile && (
          <div className="absolute right-4">
            <SidebarTrigger />
          </div>
        )}
      </div>
    </header>;
};