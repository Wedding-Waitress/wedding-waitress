import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Guest } from "@/hooks/useGuests";

interface SelectedGuest {
  id: string;
  first_name: string;
  last_name: string;
}

interface FamilyGroupComboboxProps {
  eventId: string;
  value: string;
  onChange: (value: string) => void;
  onSelectedMembersChange: (members: SelectedGuest[]) => void;
  selectedMembers?: SelectedGuest[];
  currentGuestId?: string;
  placeholder?: string;
}

export const FamilyGroupCombobox: React.FC<FamilyGroupComboboxProps> = ({
  eventId,
  value,
  onChange,
  onSelectedMembersChange,
  selectedMembers = [],
  currentGuestId,
  placeholder = "Enter family or group name"
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableGuests, setAvailableGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch available guests for selection
  const fetchAvailableGuests = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId);

      if (error) {
        console.error('Error fetching guests:', error);
        return;
      }

      // Filter out current guest and already selected members
      const selectedIds = selectedMembers.map(m => m.id);
      const filtered = (data || []).filter(guest => 
        guest.id !== currentGuestId && !selectedIds.includes(guest.id)
      );
      
      setAvailableGuests(filtered);
    } catch (error) {
      console.error('Error fetching guests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter guests based on search query
  const filteredGuests = availableGuests.filter(guest => {
    const fullName = `${guest.first_name} ${guest.last_name}`.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return fullName.includes(searchLower) || 
           guest.first_name.toLowerCase().includes(searchLower) ||
           (guest.last_name && guest.last_name.toLowerCase().includes(searchLower));
  });

  useEffect(() => {
    if (open) {
      fetchAvailableGuests();
    }
  }, [open, eventId, selectedMembers, currentGuestId]);

  const handleSelectGuest = (guest: Guest, checked: boolean) => {
    if (checked) {
      const newMember = {
        id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name
      };
      onSelectedMembersChange([...selectedMembers, newMember]);
    } else {
      onSelectedMembersChange(selectedMembers.filter(m => m.id !== guest.id));
    }
  };

  const handleRemoveMember = (memberId: string) => {
    onSelectedMembersChange(selectedMembers.filter(m => m.id !== memberId));
  };

  const handleInputFocus = () => {
    setOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSearchQuery(newValue);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              value={value}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder={placeholder}
              className="w-full"
            />
            {open && (
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search guests by name..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading guests...
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        No guests found matching "{searchQuery}"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Create a new guest to add them to this family group
                      </p>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredGuests.map((guest) => {
                      const isSelected = selectedMembers.some(m => m.id === guest.id);
                      return (
                        <CommandItem
                          key={guest.id}
                          className="flex items-center space-x-2 cursor-pointer"
                          onSelect={() => handleSelectGuest(guest, !isSelected)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectGuest(guest, !!checked)}
                          />
                          <span className="flex-1">
                            {guest.first_name} {guest.last_name}
                          </span>
                          {guest.family_group && (
                            <Badge variant="secondary" className="text-xs">
                              {guest.family_group}
                            </Badge>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Members Display */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedMembers.map((member) => (
            <Badge key={member.id} variant="secondary" className="text-xs flex items-center gap-1">
              {member.first_name} {member.last_name}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveMember(member.id)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};