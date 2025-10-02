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
      <div className="flex h-16 items-center justify-center px-6 relative">
        {/* Logo on the left */}
        <div className="absolute left-6 flex items-center">
          <img 
            src={logoImage} 
            alt="Wedding Waitress" 
            className="h-20 w-auto"
          />
        </div>

        {/* Welcome message centered */}
        <div className="flex items-center">
          <h2 className="text-2xl md:text-4xl font-semibold text-primary">
            Welcome {getDisplayName()}
          </h2>
        </div>
      </div>
    </header>
  );
};
