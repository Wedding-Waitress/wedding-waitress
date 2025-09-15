import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Guest } from "@/hooks/useGuests";

interface FamilyGroupManagerProps {
  eventId: string;
  currentGuest: {
    id: string;
    first_name: string;
    last_name: string;
    family_group: string | null;
  };
  onMemberAdded: () => void;
}

export const FamilyGroupManager: React.FC<FamilyGroupManagerProps> = ({
  eventId,
  currentGuest,
  onMemberAdded,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [familyMembers, setFamilyMembers] = useState<Guest[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all guests from the event
  const fetchGuests = async () => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('event_id', eventId);

      if (error) {
        console.error('Error fetching guests:', error);
        return;
      }

      setAllGuests(data || []);
      
      // Get current family members
      if (currentGuest.family_group) {
        const members = (data || []).filter(g => 
          g.family_group === currentGuest.family_group && g.id !== currentGuest.id
        );
        setFamilyMembers(members);
      }
    } catch (error) {
      console.error('Error fetching guests:', error);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, [eventId, currentGuest.family_group]);

  // Filter guests based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGuests([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allGuests.filter(guest => {
      // Exclude current guest and guests already in the same family group
      if (guest.id === currentGuest.id) return false;
      if (guest.family_group === currentGuest.family_group && currentGuest.family_group) return false;

      const fullName = `${guest.first_name} ${guest.last_name}`.toLowerCase();
      return fullName.includes(query);
    });

    setFilteredGuests(filtered);
  }, [searchQuery, allGuests, currentGuest]);

  const addToFamilyGroup = async (guestToAdd: Guest) => {
    if (!currentGuest.family_group) {
      toast({
        title: "Error",
        description: "Please set a family/group name first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({ family_group: currentGuest.family_group })
        .eq('id', guestToAdd.id);

      if (error) {
        console.error('Error adding to family group:', error);
        toast({
          title: "Error",
          description: "Failed to add guest to family group",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `${guestToAdd.first_name} ${guestToAdd.last_name} added to family group`,
      });

      // Refresh data
      await fetchGuests();
      onMemberAdded();
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding to family group:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFromFamilyGroup = async (guestToRemove: Guest) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({ family_group: null })
        .eq('id', guestToRemove.id);

      if (error) {
        console.error('Error removing from family group:', error);
        toast({
          title: "Error",
          description: "Failed to remove guest from family group",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `${guestToRemove.first_name} ${guestToRemove.last_name} removed from family group`,
      });

      // Refresh data
      await fetchGuests();
      onMemberAdded();
    } catch (error) {
      console.error('Error removing from family group:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewGuest = () => {
    // For now, show a message - this would ideally open a new guest creation modal
    toast({
      title: "Create New Guest",
      description: "Please close this dialog and use the 'Add Guest' button to create a new guest, then edit this guest again to link them.",
    });
  };

  if (!currentGuest.family_group) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">Set a Family/Group name above to manage family members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Separator />
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Family/Group Members</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Search for existing guests to add them to the "{currentGuest.family_group}" group.
        </p>

        {/* Current family members */}
        {familyMembers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Current Members:</h4>
            <div className="flex flex-wrap gap-2">
              {familyMembers.map((member) => (
                <Badge key={member.id} variant="secondary" className="gap-1">
                  {member.first_name} {member.last_name}
                  <button
                    onClick={() => removeFromFamilyGroup(member)}
                    className="ml-1 text-xs hover:text-destructive"
                    disabled={loading}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Search for guests */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search for guests to add to this family/group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Search results */}
        {searchQuery && (
          <div className="space-y-2">
            {filteredGuests.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">Found guests:</p>
                {filteredGuests.map((guest) => (
                  <div key={guest.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <span className="font-medium">{guest.first_name} {guest.last_name}</span>
                      {guest.family_group && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Currently in: {guest.family_group})
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addToFamilyGroup(guest)}
                      disabled={loading}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-4 border rounded-md">
                <p className="text-sm text-muted-foreground mb-2">
                  No guests found with "{searchQuery}"
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={createNewGuest}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Create New Guest
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};