import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CeremonyMusicRowProps {
  value: any;
  onChange: (value: any) => void;
}

const ceremonyMoments = [
  'Prelude (Guests Arriving)',
  'Processional (Wedding Party)',
  'Bridal Entrance',
  'Signing of Register',
  'Recessional (Exit)',
  'Other'
];

export const CeremonyMusicRow = ({ value, onChange }: CeremonyMusicRowProps) => {
  const data = value || { moment: '', song: '', artist: '', link: '' };

  return (
    <div className="flex gap-3 flex-wrap md:flex-nowrap">
      <div className="w-full md:w-[180px]">
        <Select
          value={data.moment || ''}
          onValueChange={(v) => onChange({ ...data, moment: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select moment..." />
          </SelectTrigger>
          <SelectContent>
            {ceremonyMoments.map(moment => (
              <SelectItem key={moment} value={moment}>
                {moment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
