/**
 * EventNameCombobox - Smart dropdown for Ceremony/Reception name fields
 * 
 * Features:
 * - Quick-select main event name from top field
 * - "Add Different Name" option for custom input
 * - Dynamic border color (purple empty, green filled)
 */

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventNameComboboxProps {
  mainEventName: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}

export const EventNameCombobox: React.FC<EventNameComboboxProps> = ({
  mainEventName,
  value,
  onChange,
  placeholder = "e.g.; Bride & Groom's Name"
}) => {
  const [open, setOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');

  const hasValue = !!value.trim();
  const hasMainEventName = !!mainEventName.trim();

  const handleSelectMainName = () => {
    onChange(mainEventName);
    setOpen(false);
    setShowCustomInput(false);
  };

  const handleAddDifferentName = () => {
    setShowCustomInput(true);
    setCustomName(value);
  };

  const handleSaveCustomName = () => {
    if (customName.trim()) {
      onChange(customName.trim());
      setOpen(false);
      setShowCustomInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCustomName();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal rounded-full border-2 h-9 text-sm pl-3 pr-3 overflow-hidden",
            "focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none",
            hasValue
              ? "border-green-500 hover:border-green-500 focus-visible:border-green-500"
              : "border-primary hover:border-primary focus-visible:border-primary"
          )}
        >
          <span className={cn("truncate flex-1 text-left", !hasValue && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50 mr-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-popover border border-border shadow-lg z-50" align="start">
        <div className="flex flex-col">
          {/* Option 1: Use main event name */}
          {hasMainEventName && (
            <button
              type="button"
              onClick={handleSelectMainName}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors",
                value === mainEventName && "bg-muted"
              )}
            >
              <Check 
                className={cn(
                  "h-4 w-4 text-green-500",
                  value === mainEventName ? "opacity-100" : "opacity-0"
                )} 
              />
              <span className="flex-1 truncate">{mainEventName}</span>
            </button>
          )}

          {/* Divider */}
          {hasMainEventName && <div className="border-t border-border" />}

          {/* Option 2: Add different name */}
          {!showCustomInput ? (
            <button
              type="button"
              onClick={handleAddDifferentName}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <span>Add Different Name</span>
            </button>
          ) : (
            <div className="p-3 space-y-2">
              <Input
                autoFocus
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type custom name..."
                className="h-9 text-sm rounded-full border-2 border-primary focus-visible:border-[3px] focus-visible:ring-0"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomName('');
                  }}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveCustomName}
                  disabled={!customName.trim()}
                  className="h-7 text-xs bg-green-500 hover:bg-green-600"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
