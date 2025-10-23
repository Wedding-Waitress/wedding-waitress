import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SectionSelectorProps {
  activeSection: string;
  onChange: (section: string) => void;
}

const SECTION_OPTIONS = [
  'All Sections',
  'Ceremony Music',
  'Bridal Party Introductions',
  'Speeches',
  'Main Event Songs',
  'Background / Dinner Music',
  'Dance Music',
  'Traditional / Multicultural Music',
  'Do Not Play Songs',
] as const;

export const SectionSelector: React.FC<SectionSelectorProps> = ({
  activeSection,
  onChange,
}) => {
  return (
    <div className="w-full print:hidden">
      <Tabs value={activeSection} onValueChange={onChange} className="w-full">
        <TabsList className="w-full h-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1 p-1 bg-muted/30">
          {SECTION_OPTIONS.map((section) => (
            <TabsTrigger
              key={section}
              value={section}
              className="text-xs sm:text-sm px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-normal h-auto min-h-[2.5rem]"
            >
              {section}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};
