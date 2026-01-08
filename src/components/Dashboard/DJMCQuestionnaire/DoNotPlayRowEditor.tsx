import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Ban } from 'lucide-react';
import type { DoNotPlayData, ItemData } from '@/types/djmcQuestionnaire';

interface DoNotPlayRowEditorProps {
  data: ItemData;
  index: number;
  onSave: (data: ItemData) => void;
  onDelete: () => void;
}

export const DoNotPlayRowEditor: React.FC<DoNotPlayRowEditorProps> = ({
  data,
  index,
  onSave,
  onDelete,
}) => {
  const doNotPlayData = data as DoNotPlayData;
  const [songOrGenre, setSongOrGenre] = useState(doNotPlayData.song_or_genre || '');
  const [notes, setNotes] = useState(doNotPlayData.notes || '');

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave({
        song_or_genre: songOrGenre,
        notes,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [songOrGenre, notes]);

  return (
    <div className="bg-destructive/5 rounded-lg p-3 space-y-3 border border-destructive/20">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <Ban className="w-4 h-4" />
        Do Not Play #{index + 1}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Song or Genre */}
        <div className="md:col-span-5">
          <Input
            value={songOrGenre}
            onChange={(e) => setSongOrGenre(e.target.value)}
            placeholder="Song title or genre..."
            className="bg-background"
          />
        </div>

        {/* Notes */}
        <div className="md:col-span-6">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason (optional)..."
            className="bg-background"
          />
        </div>

        {/* Delete */}
        <div className="md:col-span-1 flex items-center justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete row"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
