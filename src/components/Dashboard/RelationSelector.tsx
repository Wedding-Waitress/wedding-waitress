import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from "@/components/ui/enhanced-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RelationPartner, RelationRole, getAllRoleOptions, computeRelationDisplay } from "@/lib/relationUtils";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RelationSelectorProps {
  value: {
    partner: RelationPartner;
    role: RelationRole;
  };
  onChange: (partner: RelationPartner, role: RelationRole) => void;
  partner1Name?: string | null;
  partner2Name?: string | null;
  isOpen: boolean;
  onToggle: () => void;
  error?: string;
  customRoles?: string[];
  allowCustomRoles?: boolean;
  isSinglePerson?: boolean;
  eventId: string;
  onCustomRoleAdded?: (roles: string[]) => void;
}

export const RelationSelector: React.FC<RelationSelectorProps> = ({
  value,
  onChange,
  partner1Name,
  partner2Name,
  isOpen,
  onToggle,
  error,
  customRoles = [],
  allowCustomRoles = false,
  isSinglePerson = false,
  eventId,
  onCustomRoleAdded
}) => {
  const { toast } = useToast();
  const [selectedPartner, setSelectedPartner] = useState<RelationPartner>(value.partner);
  const [selectedRole, setSelectedRole] = useState<RelationRole>(value.role);
  const [newCustomRole, setNewCustomRole] = useState('');
  const [isAddingRole, setIsAddingRole] = useState(false);

  // Get all available role options (default + custom)
  const roleOptions = getAllRoleOptions(allowCustomRoles ? customRoles : []);

  useEffect(() => {
    setSelectedPartner(value.partner);
    setSelectedRole(value.role);
  }, [value.partner, value.role]);

  const handleRoleSelect = (partner: RelationPartner, role: RelationRole) => {
    setSelectedPartner(partner);
    setSelectedRole(role);
  };

  const handleConfirm = () => {
    onChange(selectedPartner, selectedRole);
    onToggle();
  };

  const handleCancel = () => {
    // Reset to current value
    setSelectedPartner(value.partner);
    setSelectedRole(value.role);
    setNewCustomRole('');
    onToggle();
  };

  const handleAddCustomRole = async () => {
    const roleName = newCustomRole.trim();
    if (!roleName) return;
    
    // Check if already exists (case-insensitive)
    if (customRoles.some(r => r.toLowerCase() === roleName.toLowerCase())) {
      toast({
        title: "Already Exists",
        description: "This custom relation already exists",
        variant: "destructive",
      });
      return;
    }
    
    setIsAddingRole(true);
    try {
      const updatedRoles = [...customRoles, roleName];
      
      const { error } = await supabase
        .from('events')
        .update({ custom_roles: updatedRoles })
        .eq('id', eventId);
      
      if (!error) {
        // Create the custom role value
        const customRoleValue = `custom_${roleName.toLowerCase().replace(/\s+/g, '_')}` as RelationRole;
        
        // Auto-select the newly created role
        setSelectedRole(customRoleValue);
        
        // Clear input
        setNewCustomRole('');
        
        // Notify parent
        if (onCustomRoleAdded) {
          onCustomRoleAdded(updatedRoles);
        }
        
        toast({
          title: "Custom Relation Added",
          description: `"${roleName}" has been added and selected`,
        });
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Error adding custom role:', error);
      toast({
        title: "Error",
        description: "Failed to add custom relation",
        variant: "destructive",
      });
    } finally {
      setIsAddingRole(false);
    }
  };

  // Display current selection
  const displayText = value.partner && value.role 
    ? computeRelationDisplay(
        value.partner, 
        value.role, 
        partner1Name, 
        partner2Name, 
        customRoles
      )
    : '';

  return (
    <div className="relative">
      {/* Field Input */}
      <div 
        onClick={onToggle}
        className={cn(
          "w-full px-3 py-2 text-sm rounded-full border-2 cursor-pointer transition-colors",
          error 
            ? 'border-red-500' 
            : 'border-[#7248e6] hover:border-[#7248e6]',
          isOpen && !error && 'border-[#7248e6] border-[3px]'
        )}
      >
        {displayText || (
          <span className="text-muted-foreground">Select partner & role</span>
        )}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleCancel}
          />
          
          {/* Panel */}
          <Card className="absolute top-full left-0 right-0 mt-1 p-0 z-50 shadow-lg animate-scale-in bg-background">
          {/* Header */}
            <div className={cn(
              "grid border-b",
              isSinglePerson ? "grid-cols-1" : "grid-cols-2"
            )}>
              <div className={cn(
                "p-3 text-center bg-primary/10",
                isSinglePerson ? "rounded-t-lg" : "border-r rounded-tl-full"
              )}>
                <div className="text-base font-medium text-primary">
                  {partner1Name || 'Partner 1'}
                </div>
              </div>
              {!isSinglePerson && (
                <div className="p-3 text-center bg-primary/10 rounded-tr-full">
                  <div className="text-base font-medium text-primary">
                    {partner2Name || 'Partner 2'}
                  </div>
                </div>
              )}
            </div>

            {/* Options Grid */}
            <div className="max-h-64 overflow-y-auto">
              <div className={cn(
                "grid",
                isSinglePerson ? "grid-cols-1" : "grid-cols-2"
              )}>
                {/* Partner 1 Column */}
                <div className={!isSinglePerson ? "border-r" : ""}>
                  {roleOptions.map((role) => (
                    <div
                      key={`partner_one_${role.value}`}
                      onClick={() => handleRoleSelect('partner_one', role.value as RelationRole)}
                      className={`flex items-center px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedPartner === 'partner_one' && selectedRole === role.value
                          ? 'bg-primary/5'
                          : ''
                      }`}
                    >
                      <div className="w-4 h-4 mr-2 flex-shrink-0">
                        {selectedPartner === 'partner_one' && selectedRole === role.value && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <span className={`text-sm ${role.isCustom ? 'italic' : ''}`}>
                        {role.label}
                        {role.isCustom && <span className="text-xs text-muted-foreground ml-1">(custom)</span>}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Partner 2 Column - Only show if NOT single person */}
                {!isSinglePerson && (
                  <div>
                    {roleOptions.map((role) => (
                      <div
                        key={`partner_two_${role.value}`}
                        onClick={() => handleRoleSelect('partner_two', role.value as RelationRole)}
                        className={`flex items-center px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedPartner === 'partner_two' && selectedRole === role.value
                            ? 'bg-primary/5'
                            : ''
                        }`}
                      >
                        <div className="w-4 h-4 mr-2 flex-shrink-0">
                          {selectedPartner === 'partner_two' && selectedRole === role.value && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <span className={`text-sm ${role.isCustom ? 'italic' : ''}`}>
                          {role.label}
                          {role.isCustom && <span className="text-xs text-muted-foreground ml-1">(custom)</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Add Custom Role Section - only show if allowCustomRoles is true */}
            {allowCustomRoles && (
              <div className="border-t bg-muted/10 p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Add New Custom Relation
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type relation name..."
                    value={newCustomRole}
                    onChange={(e) => setNewCustomRole(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newCustomRole.trim()) {
                        e.preventDefault();
                        handleAddCustomRole();
                      }
                    }}
                    className="flex-1 h-8 text-sm"
                    disabled={isAddingRole}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomRole}
                    disabled={!newCustomRole.trim() || isAddingRole}
                    className="h-8 px-3"
                  >
                    {isAddingRole ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 p-3 border-t bg-muted/20">
              <Button
                type="button"
                variant="destructive" 
                size="sm"
                className="rounded-full bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="rounded-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleConfirm}
                disabled={!selectedPartner || !selectedRole}
              >
                Select
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};