import { Input } from '@/components/ui/input';

interface AnnouncementRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const AnnouncementRow = ({ value, onChange }: AnnouncementRowProps) => {
  const data = value || { announcement: '', cue: '', notes: '' };

  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <Input
          placeholder="Announcement (e.g., Cake cutting)"
          value={data.announcement || ''}
          onChange={(e) => onChange({ ...data, announcement: e.target.value })}
        />
      </div>
      <div className="w-48">
        <Input
          placeholder="Time/Cue"
          value={data.cue || ''}
          onChange={(e) => onChange({ ...data, cue: e.target.value })}
        />
      </div>
      <div className="flex-1">
        <Input
          placeholder="Notes (optional)"
          value={data.notes || ''}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
        />
      </div>
    </div>
  );
};
