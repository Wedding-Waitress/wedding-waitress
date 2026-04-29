/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The Guest List page feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break guest list management
 * - Changes could break bulk actions and RSVP workflows
 * - Changes could break real-time synchronisation
 *
 * Last locked: 2026-02-19
 */
import React, { useState } from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomRoleManagerProps {
  eventId: string;
  customRoles: string[];
  onRolesUpdate: (roles: string[]) => void;
}

export const CustomRoleManager: React.FC<CustomRoleManagerProps> = ({
  eventId,
  customRoles,
  onRolesUpdate,
}) => {
  const [newRole, setNewRole] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const addCustomRole = async () => {
    const roleName = newRole.trim();
    if (!roleName) return;

    // Check for duplicates
    if (customRoles.includes(roleName)) {
      toast({
        title: "Error",
        description: "This role already exists",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const updatedRoles = [...customRoles, roleName];
      
      const { error } = await supabase
        .from('events')
        .update({ custom_roles: updatedRoles })
        .eq('id', eventId);

      if (error) {
        console.error('Error adding custom role:', error);
        toast({
          title: "Error",
          description: "Failed to add custom role",
          variant: "destructive",
        });
        return;
      }

      onRolesUpdate(updatedRoles);
      setNewRole('');
      toast({
        title: "Success",
        description: `Added custom role: ${roleName}`,
      });
    } catch (error) {
      console.error('Error adding custom role:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const removeCustomRole = async (roleToRemove: string) => {
    try {
      const updatedRoles = customRoles.filter(role => role !== roleToRemove);
      
      const { error } = await supabase
        .from('events')
        .update({ custom_roles: updatedRoles })
        .eq('id', eventId);

      if (error) {
        console.error('Error removing custom role:', error);
        toast({
          title: "Error",
          description: "Failed to remove custom role",
          variant: "destructive",
        });
        return;
      }

      onRolesUpdate(updatedRoles);
      toast({
        title: "Success",
        description: `Removed custom role: ${roleToRemove}`,
      });
    } catch (error) {
      console.error('Error removing custom role:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addCustomRole();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Custom Roles</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Add custom roles that will appear in the Who Is selector alongside the default roles.
        </p>
      </div>

      {/* Existing custom roles */}
      {customRoles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customRoles.map((role) => (
            <Badge
              key={role}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {role}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeCustomRole(role)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add new role */}
      <div className="flex gap-2">
        <Input
          placeholder="Enter custom role name"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={addCustomRole}
          disabled={!newRole.trim() || isAdding}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
