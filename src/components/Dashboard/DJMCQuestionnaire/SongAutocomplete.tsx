import React, { useState } from 'react';
import { Input } from '@/components/ui/input';

interface SongAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (song: { title: string; artist: string }) => void;
  placeholder?: string;
}

export const SongAutocomplete: React.FC<SongAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "Song title...",
}) => {
  // Simple input for now - AI autocomplete will be added in next phase
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-background"
    />
  );
};
