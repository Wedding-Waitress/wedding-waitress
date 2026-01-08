import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SectionSelectorProps {
  activeSection: string;
  onChange: (section: string) => void;
}

const SECTION_OPTIONS = [
  { id: 'All Sections', label: 'All Sections', icon: '📋' },
  { id: 'Ceremony Music', label: 'Ceremony Music', icon: '💒' },
  { id: 'Bridal Party Introductions', label: 'Bridal Party Introductions', icon: '👰' },
  { id: 'Speeches', label: 'Speeches', icon: '🎤' },
  { id: 'Main Event Songs', label: 'Main Event Songs', icon: '⭐' },
  { id: 'Background / Dinner Music', label: 'Background / Dinner Music', icon: '🍽️' },
  { id: 'Dance Music', label: 'Dance Music', icon: '💃' },
  { id: 'Traditional / Multicultural Music', label: 'Traditional / Multicultural Music', icon: '🌍' },
  { id: 'Do Not Play Songs', label: 'Do not play list', icon: '🚫' },
] as const;

export const SectionSelector: React.FC<SectionSelectorProps> = ({
  activeSection,
  onChange,
}) => {
  return (
    <div className="w-full h-full print:hidden">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Navigate Sections
      </h3>
      <ScrollArea className="h-[400px] lg:h-[500px]">
        <div className="space-y-2 pr-4">
          {SECTION_OPTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <Button
                key={section.id}
                onClick={() => onChange(section.id)}
                variant={isActive ? 'default' : 'ghost'}
                className={`
                  w-full justify-start text-left h-auto py-3 px-4 
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <span className="text-lg mr-3">{section.icon}</span>
                <span className="text-sm font-medium">{section.label}</span>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
