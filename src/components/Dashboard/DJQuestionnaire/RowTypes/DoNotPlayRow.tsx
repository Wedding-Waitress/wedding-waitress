import { Input } from '@/components/ui/input';

interface DoNotPlayRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const DoNotPlayRow = ({ value, onChange }: DoNotPlayRowProps) => {
  const data = value || { songOrGenre: '', notes: '' };

  return (
    <div className="flex gap-3 flex-wrap md:flex-nowrap">
      <div className="flex-1 min-w-[150px]">
        <Input
          placeholder="Song or Genre to Avoid"
          value={data.songOrGenre || ''}
          onChange={(e) => onChange({ ...data, songOrGenre: e.target.value })}
          maxLength={200}
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Notes (optional)"
          value={data.notes || ''}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          maxLength={300}
        />
      </div>
    </div>
  );
};
