import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import logoImage from '@/assets/wedding-waitress-header-logo.png';
import { Sparkles } from 'lucide-react';
export const DashboardHeader: React.FC = () => {
  const {
    profile
  } = useProfile();
  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (profile?.email) {
      return profile.email.split('@')[0];
    }
    return 'User';
  };
  return <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 print:hidden">
      <div className="flex h-16 items-center justify-between px-6 my-[10px]">
        {/* Logo on the left */}
        <div className="flex items-center flex-shrink-0">
          <img src={logoImage} alt="Wedding Waitress" className="h-14 w-auto" />
        </div>

        {/* Welcome message in the center */}
        <div className="flex items-center justify-center flex-1">
          <h2 className="text-xl md:text-2xl font-semibold text-primary flex items-center gap-2">
            Welcome {getDisplayName()}
            <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-primary" />
          </h2>
        </div>

        {/* Empty div for balance */}
        <div className="flex-shrink-0 w-[56px]"></div>
      </div>
    </header>;
};