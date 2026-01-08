import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { validateMusicURL } from '@/lib/urlValidation';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface BridalPartyEnhancedRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const BridalPartyEnhancedRow = ({ value, onChange }: BridalPartyEnhancedRowProps) => {
  const data = value || { role: '', names: '', pronunciation: '', entranceSong: '', link: '' };
  const [urlValidation, setUrlValidation] = useState({ isValid: true, error: '' });

  useEffect(() => {
    if (data.link) {
      const result = validateMusicURL(data.link);
      setUrlValidation({
        isValid: result.isValid,
        error: result.error || '',
      });
    } else {
      setUrlValidation({ isValid: true, error: '' });
    }
  }, [data.link]);

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
        <div className="flex-1 min-w-[150px] relative">
          <Input
            placeholder="Link (optional)"
            value={data.link || ''}
            onChange={(e) => onChange({ ...data, link: e.target.value })}
            maxLength={500}
            className={
              data.link && !urlValidation.isValid
                ? 'border-destructive focus-visible:ring-destructive pr-8'
                : data.link && urlValidation.isValid
                ? 'border-success focus-visible:ring-success pr-8'
                : ''
            }
          />
          {data.link && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              {urlValidation.isValid ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
          )}
        </div>
      </div>
      {data.link && !urlValidation.isValid && (
        <p className="text-xs text-destructive flex items-center gap-1 ml-2">
          <AlertCircle className="w-3 h-3" />
          {urlValidation.error}
        </p>
      )}
    </div>
  );
};
