import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CulturalMusicEnhancedRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const CulturalMusicEnhancedRow = ({ value, onChange }: CulturalMusicEnhancedRowProps) => {
  const data = value || { blockName: '', whenToPlay: '', songs: '' };

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap md:flex-nowrap">
        <div className="flex-1 min-w-[150px]">
          <Input
            placeholder="Block Name (e.g., Greek Dancing, Bollywood)"
            value={data.blockName || ''}
            onChange={(e) => onChange({ ...data, blockName: e.target.value })}
            maxLength={150}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Input
            placeholder="When to Play (e.g., After main course)"
            value={data.whenToPlay || ''}
            onChange={(e) => onChange({ ...data, whenToPlay: e.target.value })}
            maxLength={200}
          />
        </div>
      </div>
      <Textarea
        placeholder="Songs (list each song and artist on a new line, e.g., 'Zorba's Dance - Mikis Theodorakis')"
        value={data.songs || ''}
        onChange={(e) => onChange({ ...data, songs: e.target.value })}
        rows={3}
        maxLength={1000}
        className="resize-none"
      />
    </div>
  );
};
