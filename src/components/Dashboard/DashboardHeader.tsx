import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import logoImage from '@/assets/wedding-waitress-header-logo.png';

export const DashboardHeader: React.FC = () => {
  const { profile } = useProfile();

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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 print:hidden">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo on the left */}
        <div className="flex items-center">
          <img 
            src={logoImage} 
            alt="Wedding Waitress" 
            className="h-10 w-auto"
          />
        </div>

        {/* Welcome message on the right */}
        <div className="flex items-center">
          <h2 className="text-lg md:text-xl font-semibold text-primary">
            Welcome {getDisplayName()}
          </h2>
        </div>
      </div>
    </header>
  );
};
