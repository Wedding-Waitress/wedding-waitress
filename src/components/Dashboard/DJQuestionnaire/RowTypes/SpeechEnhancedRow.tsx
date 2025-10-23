import { Input } from '@/components/ui/input';

interface SpeechEnhancedRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const SpeechEnhancedRow = ({ value, onChange }: SpeechEnhancedRowProps) => {
  const data = value || { order: '', name: '', role: '', notes: '' };

  return (
    <div className="flex gap-3 flex-wrap md:flex-nowrap">
      <div className="w-full md:w-[80px]">
        <Input
          type="number"
          placeholder="#"
          value={data.order || ''}
          onChange={(e) => onChange({ ...data, order: e.target.value })}
          min={1}
          max={99}
        />
      </div>
      <div className="flex-1 min-w-[130px]">
        <Input
          placeholder="Speaker Name"
          value={data.name || ''}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          maxLength={100}
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <Input
          placeholder="Role (e.g., Best Man)"
          value={data.role || ''}
          onChange={(e) => onChange({ ...data, role: e.target.value })}
          maxLength={100}
        />
      </div>
      <div className="flex-1 min-w-[150px]">
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
