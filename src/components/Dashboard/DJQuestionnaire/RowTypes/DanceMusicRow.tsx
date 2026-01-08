import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { validateMusicURL } from '@/lib/urlValidation';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface DanceMusicRowProps {
  value: any;
  onChange: (value: any) => void;
}

export const DanceMusicRow = ({ value, onChange }: DanceMusicRowProps) => {
  const data = value || { song: '', artist: '', link: '' };
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
    <>
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
        <div className="flex-1 min-w-[150px] relative">
          <Input
            placeholder="YouTube, Spotify, Apple Music"
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
    </>
  );
};
