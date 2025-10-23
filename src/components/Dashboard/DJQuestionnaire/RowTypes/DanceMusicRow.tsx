import { Input } from '@/components/ui/input';

interface DanceMusicRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const DanceMusicRow = ({ value, onChange }: DanceMusicRowProps) => {
  const data = value || { song: '', artist: '', link: '' };

  return (
    <div className="flex gap-3 flex-wrap md:flex-nowrap">
      <div className="flex-1 min-w-[150px]">
        <Input
          placeholder="Song Title"
          value={data.song || ''}
          onChange={(e) => onChange({ ...data, song: e.target.value })}
          maxLength={200}
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <Input
          placeholder="Artist"
          value={data.artist || ''}
          onChange={(e) => onChange({ ...data, artist: e.target.value })}
          maxLength={150}
        />
      </div>
      <div className="flex-1 min-w-[150px]">
        <Input
          placeholder="Spotify/YouTube Link"
          value={data.link || ''}
          onChange={(e) => onChange({ ...data, link: e.target.value })}
          maxLength={500}
        />
      </div>
    </div>
  );
};
