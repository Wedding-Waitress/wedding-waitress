import { Input } from '@/components/ui/input';

interface BridalPartyEnhancedRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const BridalPartyEnhancedRow = ({ value, onChange }: BridalPartyEnhancedRowProps) => {
  const data = value || { role: '', names: '', pronunciation: '', entranceSong: '', link: '' };

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap md:flex-nowrap">
        <div className="flex-1 min-w-[140px]">
          <Input
            placeholder="Role/Group (e.g., Maid of Honor)"
            value={data.role || ''}
            onChange={(e) => onChange({ ...data, role: e.target.value })}
            maxLength={100}
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Input
            placeholder="Name(s)"
            value={data.names || ''}
            onChange={(e) => onChange({ ...data, names: e.target.value })}
            maxLength={200}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <Input
            placeholder="Pronunciation (phonetic)"
            value={data.pronunciation || ''}
            onChange={(e) => onChange({ ...data, pronunciation: e.target.value })}
            maxLength={150}
          />
        </div>
      </div>
      <div className="flex gap-3 flex-wrap md:flex-nowrap">
        <div className="flex-1 min-w-[150px]">
          <Input
            placeholder="Entrance Song (optional)"
            value={data.entranceSong || ''}
            onChange={(e) => onChange({ ...data, entranceSong: e.target.value })}
            maxLength={200}
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Input
            placeholder="Link (optional)"
            value={data.link || ''}
            onChange={(e) => onChange({ ...data, link: e.target.value })}
            maxLength={500}
          />
        </div>
      </div>
    </div>
  );
};
