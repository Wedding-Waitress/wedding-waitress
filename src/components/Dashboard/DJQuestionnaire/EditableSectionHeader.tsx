import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Pencil } from 'lucide-react';

interface EditableSectionHeaderProps {
  label: string;
  onSave: (newLabel: string) => void;
}

export const EditableSectionHeader = ({ label, onSave }: EditableSectionHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(label);

  useEffect(() => {
    setValue(label);
  }, [label]);

  const handleSave = () => {
    if (value.trim() && value !== label) {
      onSave(value.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(label);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="text-lg font-semibold border-[#6D28D9] focus:border-[#6D28D9] focus:ring-[#6D28D9]"
        autoFocus
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-2 cursor-pointer hover:text-[#6D28D9] transition-colors"
    >
      <h3 className="text-lg font-semibold border-b-2 border-dashed border-transparent group-hover:border-[#6D28D9] transition-all">
        {label}
      </h3>
      <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#6D28D9]" />
    </div>
  );
};
