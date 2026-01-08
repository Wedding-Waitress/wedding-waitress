import { Input } from '@/components/ui/input';

interface CulturalRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const CulturalRow = ({ value, onChange }: CulturalRowProps) => {
  const data = value || { tradition: '', songArtist: '', whenToPlay: '' };

  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <Input
          placeholder="Tradition/Style (e.g., Hora, Tarantella)"
          value={data.tradition || ''}
          onChange={(e) => onChange({ ...data, tradition: e.target.value })}
        />
      </div>
      <div className="flex-1">
        <Input
          placeholder="Song/Artist"
          value={data.songArtist || ''}
          onChange={(e) => onChange({ ...data, songArtist: e.target.value })}
        />
      </div>
      <div className="flex-1">
        <Input
          placeholder="When to play"
          value={data.whenToPlay || ''}
          onChange={(e) => onChange({ ...data, whenToPlay: e.target.value })}
        />
      </div>
    </div>
  );
};
