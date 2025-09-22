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
  const [selectedMemberDetails, setSelectedMemberDetails] = useState<GuestSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set(selectedMembers));
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when currentGuestId or eventId changes (new guest or different event)
  useEffect(() => {
    setInputValue('');
    setSearchResults([]);
    setSelectedMemberDetails([]);
    setSelectedMemberIds(new Set());
    setSearchQuery('');
    setOpen(false);
  }, [currentGuestId, eventId]);

  // Update local state when props change
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value, inputValue]);

  useEffect(() => {
    const newSelectedMemberIds = new Set(selectedMembers);
    if (JSON.stringify([...selectedMemberIds]) !== JSON.stringify([...newSelectedMemberIds])) {
      setSelectedMemberIds(newSelectedMemberIds);
      // Fetch details for selected members
      if (selectedMembers.length > 0 && eventId) {
        fetchSelectedMemberDetails(selectedMembers);
      } else {
        setSelectedMemberDetails([]);
      }
    }
  }, [selectedMembers, eventId, selectedMemberIds]);

  // Defensive clear: empty selectedMemberDetails if family name is empty and no members selected
  useEffect(() => {
    if (!value && selectedMembers.length === 0 && selectedMemberDetails.length > 0) {
      setSelectedMemberDetails([]);
    }
  }, [value, selectedMembers, selectedMemberDetails.length]);

  // Check total family members including current guest
  const checkTotalFamilyMembers = async (familyName: string): Promise<number> => {
    if (!familyName.trim() || !eventId) return 0;

    try {
      const { count, error } = await supabase
        .from('guests')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)
        .eq('family_group', familyName);

      if (error) {
        console.error('Error checking total family members:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error checking total family members:', error);
      return 0;
    }
  };

  // Check if there are other guests with the same family name
  const checkRemainingFamilyMembers = async (familyName: string, excludeIds: string[]): Promise<number> => {
    if (!familyName.trim() || !eventId) return 0;

    try {
      const allExcludeIds = [currentGuestId, ...excludeIds].filter(Boolean);
      
      let queryBuilder = supabase
        .from('guests')
        .select('id', { count: 'exact' })
        .eq('event_id', eventId)
        .eq('family_group', familyName);
        
      if (allExcludeIds.length > 0) {
        queryBuilder = queryBuilder.not('id', 'in', `(${allExcludeIds.join(',')})`);
      }

      const { count, error } = await queryBuilder;

      if (error) {
        console.error('Error checking remaining family members:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error checking remaining family members:', error);
      return 0;
    }
  };

  // Fetch details for selected members to display as chips
  const fetchSelectedMemberDetails = async (memberIds: string[]) => {
    if (memberIds.length === 0) {
      setSelectedMemberDetails([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('guests')
        .select('id, first_name, last_name')
        .in('id', memberIds);

      if (!error && data) {
        setSelectedMemberDetails(data as GuestSearchResult[]);
      }
    } catch (error) {
      console.error('Error fetching selected member details:', error);
    }
  };

  // Search for guests - exclude already selected and current guest
  const searchGuests = async (query: string) => {
    if (!query.trim() || !eventId) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const excludeIds = [currentGuestId, ...Array.from(selectedMemberIds)].filter(Boolean);
      
      let queryBuilder = supabase
        .from('guests')
        .select('id, first_name, last_name')
        .eq('event_id', eventId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(10);
        
      if (excludeIds.length > 0) {
        queryBuilder = queryBuilder.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data, error } = await queryBuilder;

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
  const handleMemberToggle = async (guestId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedMemberIds);
    if (checked) {
      newSelectedIds.add(guestId);
    } else {
      newSelectedIds.delete(guestId);
    }
    setSelectedMemberIds(newSelectedIds);
    
    // Update member details
    if (checked) {
      const guestData = searchResults.find(g => g.id === guestId);
      if (guestData) {
        setSelectedMemberDetails(prev => [...prev, guestData]);
      }
    } else {
      setSelectedMemberDetails(prev => prev.filter(g => g.id !== guestId));
    }
    
    // Check if we should dissolve a 2-member family
    if (!checked && inputValue.trim()) {
      const totalCount = await checkTotalFamilyMembers(inputValue);
      // If there were exactly 2 total members and we're removing the only selected member
      if (totalCount === 2 && newSelectedIds.size === 0) {
        // Dissolve the family - both guests become "Single"
        setInputValue('');
        onChange?.('', []);
        return;
      }
    }
    
    onChange?.(inputValue, Array.from(newSelectedIds));
  };

  // Remove selected member
  const removeMember = async (guestId: string) => {
    const newSelectedIds = new Set(selectedMemberIds);
    newSelectedIds.delete(guestId);
    
    // Check if we should dissolve a 2-member family
    if (inputValue.trim()) {
      const totalCount = await checkTotalFamilyMembers(inputValue);
      // If there were exactly 2 total members and we're removing the only selected member
      if (totalCount === 2 && newSelectedIds.size === 0) {
        // Dissolve the family - both guests become "Single"
        setInputValue('');
        setSelectedMemberIds(newSelectedIds);
        setSelectedMemberDetails(prev => prev.filter(g => g.id !== guestId));
        onChange?.('', []);
        return;
      }
    }
    
    // Otherwise, proceed with normal removal
    handleMemberToggle(guestId, false);
  };

  // Clear family name input
  const handleClearInput = () => {
    setInputValue('');
    setSearchQuery('');
    setSearchResults([]);
    setOpen(false);
    onChange?.('', Array.from(selectedMemberIds));
  };

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
              className={inputValue ? "pr-16 cursor-text" : "pr-8 cursor-text"}
              autoComplete="off"
              onFocus={() => {
                if (inputValue.trim()) {
                  setOpen(true);
                }
              }}
            />
            {inputValue && (
              <button
                type="button"
                onClick={handleClearInput}
                className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
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
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center flex-1">
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
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMemberToggle(guest.id, true);
                          }}
                          className="ml-2 h-6 px-2 text-xs"
                        >
                          Add Member
                        </Button>
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
      {selectedMemberDetails.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-md">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            Family Members:
          </div>
          {selectedMemberDetails.map((guest) => (
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