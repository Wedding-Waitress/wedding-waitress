import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BridalPartyRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const BridalPartyRow = ({ value, onChange }: BridalPartyRowProps) => {
  const data = value || { group: '', type: '', song: '' };

  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <Input
          placeholder="Group name (e.g., Parents of the Bride)"
          value={data.group || ''}
          onChange={(e) => onChange({ ...data, group: e.target.value })}
        />
      </div>
      <div className="w-40">
        <Select value={data.type || ''} onValueChange={(val) => onChange({ ...data, type: val })}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Parents">Parents</SelectItem>
            <SelectItem value="Attendants">Attendants</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Input
          placeholder="Entrance song (optional)"
          value={data.song || ''}
          onChange={(e) => onChange({ ...data, song: e.target.value })}
        />
      </div>
    </div>
  );
};
