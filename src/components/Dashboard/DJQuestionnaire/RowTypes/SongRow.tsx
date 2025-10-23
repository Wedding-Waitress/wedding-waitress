import { Input } from '@/components/ui/input';

interface SongRowProps {
  value: any;
  onChange: (value: any) => void;
  showMoment?: boolean;
}

export const SongRow = ({ value, onChange, showMoment = false }: SongRowProps) => {
  const data = value || { moment: '', song: '', artist: '', link: '' };

  return (
    <div className="flex gap-3">
      {showMoment && (
        <div className="w-48">
          <Input
            placeholder="Moment"
            value={data.moment || ''}
            onChange={(e) => onChange({ ...data, moment: e.target.value })}
          />
        </div>
      )}
      <div className="flex-1">
        <Input
          placeholder="Song"
          value={data.song || ''}
          onChange={(e) => onChange({ ...data, song: e.target.value })}
        />
      </div>
      <div className="flex-1">
        <Input
          placeholder="Artist"
          value={data.artist || ''}
          onChange={(e) => onChange({ ...data, artist: e.target.value })}
        />
      </div>
      <div className="flex-1">
        <Input
          placeholder="Link (optional)"
          value={data.link || ''}
          onChange={(e) => onChange({ ...data, link: e.target.value })}
        />
      </div>
    </div>
  );
};
