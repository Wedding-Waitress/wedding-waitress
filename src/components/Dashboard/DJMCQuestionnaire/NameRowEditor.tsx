import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Users, Copy } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import type { NameData, ItemData } from '@/types/djmcQuestionnaire';

interface NameRowEditorProps {
  data: ItemData;
  index: number;
  pronunciationAudioUrl?: string | null;
  itemId: string;
  onSave: (data: ItemData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const NameRowEditor: React.FC<NameRowEditorProps> = ({
  data,
  index,
  pronunciationAudioUrl,
  itemId,
  onSave,
  onDelete,
  onDuplicate,
}) => {
  const nameData = data as NameData;
  const [role, setRole] = useState(nameData.role || '');
  const [names, setNames] = useState(nameData.names || '');
  const [pronunciation, setPronunciation] = useState(nameData.pronunciation || '');

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave({
        role,
        names,
        pronunciation,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [role, names, pronunciation]);

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Users className="w-4 h-4" />
        Introduction {index + 1}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Role */}
        <div className="md:col-span-3">
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (e.g., Groom's Parents)..."
            className="bg-background"
          />
        </div>

        {/* Names */}
        <div className="md:col-span-4">
          <Input
            value={names}
            onChange={(e) => setNames(e.target.value)}
            placeholder="Full names..."
            className="bg-background"
          />
        </div>

        {/* Pronunciation */}
        <div className="md:col-span-3">
          <Input
            value={pronunciation}
            onChange={(e) => setPronunciation(e.target.value)}
            placeholder="Pronunciation guide..."
            className="bg-background"
          />
        </div>

        {/* Actions */}
        <div className="md:col-span-2 flex items-center justify-end gap-1">
          <AudioRecorder 
            itemId={itemId} 
            existingAudioUrl={pronunciationAudioUrl}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={onDuplicate}
            title="Duplicate row"
          >
            <Copy className="w-4 h-4" />
          </Button>
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
