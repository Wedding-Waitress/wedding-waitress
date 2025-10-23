import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface SectionTogglesProps {
  sectionVisibility: Record<string, boolean>;
  onToggle: (sectionLabel: string, visible: boolean) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export const SectionToggles: React.FC<SectionTogglesProps> = ({
  sectionVisibility,
  onToggle,
  onShowAll,
  onHideAll
}) => {
  // Define the 8 toggleable sections (excludes "Pronunciations" which is always visible)
  const sections = [
    'Ceremony Music',
    'Bridal Party Introductions',
    'Speeches',
    'Main Event Songs',
    'Background / Dinner Music',
    'Dance Music',
    'Traditional / Multicultural Music',
    'Do not play songs'
  ];

  return (
    <Card className="ww-box print:hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">Section Toggles</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onShowAll}
              className="gap-1.5"
            >
              <Eye className="w-4 h-4" />
              Show All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onHideAll}
              className="gap-1.5"
            >
              <EyeOff className="w-4 h-4" />
              Hide All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => (
            <div key={section} className="flex items-center space-x-3">
              <Switch
                id={`section-${section}`}
                checked={sectionVisibility[section] ?? true}
                onCheckedChange={(checked) => onToggle(section, checked)}
              />
              <Label
                htmlFor={`section-${section}`}
                className="text-sm cursor-pointer flex-1"
              >
                {section}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
