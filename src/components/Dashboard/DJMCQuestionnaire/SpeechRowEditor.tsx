import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Mic } from 'lucide-react';
import type { SpeechData, ItemData } from '@/types/djmcQuestionnaire';

interface SpeechRowEditorProps {
  data: ItemData;
  index: number;
  onSave: (data: ItemData) => void;
  onDelete: () => void;
}

export const SpeechRowEditor: React.FC<SpeechRowEditorProps> = ({
  data,
  index,
  onSave,
  onDelete,
}) => {
  const speechData = data as SpeechData;
  const [name, setName] = useState(speechData.name || '');
  const [role, setRole] = useState(speechData.role || '');
  const [notes, setNotes] = useState(speechData.notes || '');

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave({
        order: index + 1,
        name,
        role,
        notes,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [name, role, notes, index]);

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Mic className="w-4 h-4" />
        Speech {index + 1}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Name */}
        <div className="md:col-span-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Speaker name..."
            className="bg-background"
          />
        </div>

        {/* Role */}
        <div className="md:col-span-3">
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (e.g., Best Man)..."
            className="bg-background"
          />
        </div>

        {/* Notes */}
        <div className="md:col-span-4">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)..."
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
