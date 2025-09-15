import React, { useState, useEffect, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, ChevronDown, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Guest } from "@/hooks/useGuests";

interface FamilyGroupComboboxProps {
  value?: string;
  selectedMembers?: string[];
  onChange?: (familyName: string, memberIds: string[]) => void;
  eventId: string;
  currentGuestId?: string;
  placeholder?: string;
}

interface GuestSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  family_group?: string | null;
}

export const FamilyGroupCombobox: React.FC<FamilyGroupComboboxProps> = ({
  value = '',
  selectedMembers = [],
  onChange,
  eventId,
  currentGuestId,
  placeholder = "Enter family/group name or search members..."
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [searchResults, setSearchResults] = useState<GuestSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set(selectedMembers));
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local state when props change
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    setSelectedMemberIds(new Set(selectedMembers));
  }, [selectedMembers]);

  // Search for guests
  const searchGuests = async (query: string) => {
    if (!query.trim() || !eventId) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('id, first_name, last_name')
        .eq('event_id', eventId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .neq('id', currentGuestId || '')
        .limit(10);

      if (!error && data) {
        setSearchResults(data as GuestSearchResult[]);
      }
    } catch (error) {
      console.error('Error searching guests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setSearchQuery(newValue);
    
    // Trigger search when typing
    if (newValue.trim()) {
      searchGuests(newValue);
      setOpen(true);
    }
    
    // Notify parent of family name change
    onChange?.(newValue, Array.from(selectedMemberIds));
  };

  // Handle member selection
  const handleMemberToggle = (guestId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedMemberIds);
    if (checked) {
      newSelectedIds.add(guestId);
    } else {
      newSelectedIds.delete(guestId);
    }
    setSelectedMemberIds(newSelectedIds);
    onChange?.(inputValue, Array.from(newSelectedIds));
  };

  // Remove selected member
  const removeMember = (guestId: string) => {
    handleMemberToggle(guestId, false);
  };

  // Get selected guests for display
  const selectedGuests = searchResults.filter(guest => selectedMemberIds.has(guest.id));

  // Show create option when there's text but no exact match
  const showCreateOption = inputValue.trim() && 
    !searchResults.some(guest => 
      `${guest.first_name} ${guest.last_name}`.toLowerCase() === inputValue.toLowerCase()
    );

  const handleCreateFamily = () => {
    onChange?.(inputValue, Array.from(selectedMemberIds));
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Family Name Input */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={placeholder}
              className="pr-8 cursor-text"
              autoComplete="off"
              onFocus={() => {
                if (inputValue.trim()) {
                  setOpen(true);
                }
              }}
            />
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search guests by name..." 
              value={searchQuery}
              onValueChange={(value) => {
                setSearchQuery(value);
                searchGuests(value);
              }}
            />
            <CommandList>
              {loading && (
                <CommandEmpty>Searching...</CommandEmpty>
              )}
              
              {!loading && searchQuery.trim() && searchResults.length === 0 && (
                <CommandEmpty>No guests found</CommandEmpty>
              )}
              
              {showCreateOption && (
                <CommandGroup heading="Create Family">
                  <CommandItem onSelect={handleCreateFamily}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create "{inputValue}"
                  </CommandItem>
                </CommandGroup>
              )}
              
              {searchResults.length > 0 && (
                <CommandGroup heading="Add Family Members">
                  {searchResults.map((guest) => {
                    const isSelected = selectedMemberIds.has(guest.id);
                    return (
                      <CommandItem
                        key={guest.id}
                        onSelect={() => handleMemberToggle(guest.id, !isSelected)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleMemberToggle(guest.id, checked as boolean)}
                          className="mr-2"
                        />
                        <div className="flex-1">
                          <span>{guest.first_name} {guest.last_name}</span>
                          {guest.family_group && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (Currently: {guest.family_group})
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Members Chips */}
      {selectedGuests.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-md">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            Family Members:
          </div>
          {selectedGuests.map((guest) => (
            <Badge key={guest.id} variant="secondary" className="text-xs">
              {guest.first_name} {guest.last_name}
              <button
                type="button"
                onClick={() => removeMember(guest.id)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};