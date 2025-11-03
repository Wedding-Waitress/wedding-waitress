import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from "@/components/ui/enhanced-button";
import { Card } from "@/components/ui/card";
import { RelationPartner, RelationRole, getAllRoleOptions, computeRelationDisplay } from "@/lib/relationUtils";

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
  allowCustomRoles = false
}) => {
  const [selectedPartner, setSelectedPartner] = useState<RelationPartner>(value.partner);
  const [selectedRole, setSelectedRole] = useState<RelationRole>(value.role);

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
    onToggle();
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
        className={`w-full px-3 py-2 text-sm rounded-md border cursor-pointer transition-colors ${
          error 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-input hover:border-ring focus:ring-2 focus:ring-ring'
        }`}
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
            <div className="grid grid-cols-2 border-b">
              <div className="p-3 text-center bg-primary/10 border-r">
                <div className="text-sm font-medium text-primary">
                  {partner1Name || 'Partner 1'}
                </div>
              </div>
              <div className="p-3 text-center bg-primary/10">
                <div className="text-sm font-medium text-primary">
                  {partner2Name || 'Partner 2'}
                </div>
              </div>
            </div>

            {/* Options Grid */}
            <div className="max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2">
                {/* Partner 1 Column */}
                <div className="border-r">
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

                {/* Partner 2 Column */}
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
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 p-3 border-t bg-muted/20">
              <Button
                type="button"
                variant="secondary" 
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
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