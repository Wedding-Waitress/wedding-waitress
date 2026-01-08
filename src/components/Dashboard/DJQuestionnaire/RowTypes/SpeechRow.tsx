import { Input } from '@/components/ui/input';

interface SpeechRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const SpeechRow = ({ value, onChange }: SpeechRowProps) => {
  const data = value || { name: '', order: '' };

  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <Input
          placeholder="Speaker name"
          value={data.name || ''}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
        />
      </div>
      <div className="w-24">
        <Input
          type="number"
          placeholder="Order"
          value={data.order || ''}
          onChange={(e) => onChange({ ...data, order: e.target.value })}
          min="1"
        />
      </div>
    </div>
  );
};
