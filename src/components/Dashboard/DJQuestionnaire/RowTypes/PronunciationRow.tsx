import { Input } from '@/components/ui/input';

interface PronunciationRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const PronunciationRow = ({ value, onChange }: PronunciationRowProps) => {
  const data = value || { name: '', role: '', phonetic: '' };

  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <Input
          placeholder="Name"
          value={data.name || ''}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
        />
      </div>
      <div className="flex-1">
        <Input
          placeholder="Role (e.g., Bride, Best Man)"
          value={data.role || ''}
          onChange={(e) => onChange({ ...data, role: e.target.value })}
        />
      </div>
      <div className="flex-1">
        <Input
          placeholder="Phonetic spelling"
          value={data.phonetic || ''}
          onChange={(e) => onChange({ ...data, phonetic: e.target.value })}
        />
      </div>
    </div>
  );
};
