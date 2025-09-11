import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/enhanced-button";
import { X } from "lucide-react";
import { WHO_IS_ROLE_LABELS, getAllRoleOptions, RoleOption } from "@/lib/whoIsUtils";
import { whoIsAnalytics } from '@/lib/analytics';

interface FilterState {
  partners: string[];
  roles: string[];
}

interface WhoIsFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  partner1Name?: string | null;
  partner2Name?: string | null;
  customRoles?: string[];
  eventId?: string | null;
}

const ROLE_OPTIONS = [
  'bridal_party', 'father', 'mother', 'brother', 'sister', 
  'cousin', 'uncle', 'aunty', 'guest', 'vendor'
];

export const WhoIsFilters: React.FC<WhoIsFiltersProps> = ({
  filters,
  onFiltersChange,
  partner1Name,
  partner2Name,
  customRoles = [],
  eventId
}) => {
  const togglePartner = (partner: string) => {
    const newPartners = filters.partners.includes(partner)
      ? filters.partners.filter(p => p !== partner)
      : [...filters.partners, partner];
    
    onFiltersChange({ ...filters, partners: newPartners });
    
    // Analytics tracking
    if (eventId) {
      whoIsAnalytics.tableFilterUsed(eventId, partner);
    }
  };

  const toggleRole = (role: string) => {
    const newRoles = filters.roles.includes(role)
      ? filters.roles.filter(r => r !== role)
      : [...filters.roles, role];
    
    onFiltersChange({ ...filters, roles: newRoles });
    
    // Analytics tracking
    if (eventId) {
      whoIsAnalytics.tableFilterUsed(eventId, undefined, role);
    }
  };

  const clearFilters = () => {
    onFiltersChange({ partners: [], roles: [] });
  };

  const hasActiveFilters = filters.partners.length > 0 || filters.roles.length > 0;

  if (!partner1Name && !partner2Name) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-muted/20 rounded-lg border mb-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Who Is Filters</span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Partner Filters */}
      {(partner1Name || partner2Name) && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Partner:</span>
          <div className="flex flex-wrap gap-2">
            {partner1Name && (
              <Badge
                variant={filters.partners.includes('partner_one') ? 'default' : 'secondary'}
                className={`cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  filters.partners.includes('partner_one') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => togglePartner('partner_one')}
                role="button"
                tabIndex={0}
                aria-pressed={filters.partners.includes('partner_one')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    togglePartner('partner_one');
                  }
                }}
              >
                {partner1Name}
              </Badge>
            )}
            {partner2Name && (
              <Badge
                variant={filters.partners.includes('partner_two') ? 'default' : 'secondary'}
                className={`cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  filters.partners.includes('partner_two') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => togglePartner('partner_two')}
                role="button"
                tabIndex={0}
                aria-pressed={filters.partners.includes('partner_two')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    togglePartner('partner_two');
                  }
                }}
              >
                {partner2Name}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Role Filters */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">Role:</span>
        <div className="flex flex-wrap gap-2">
          {getAllRoleOptions(customRoles).map((role) => (
            <Badge
              key={role.value}
              variant={filters.roles.includes(role.value) ? 'default' : 'secondary'}
              className={`cursor-pointer transition-colors text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                filters.roles.includes(role.value) 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              } ${role.isCustom ? 'border-dashed' : ''}`}
              onClick={() => toggleRole(role.value)}
              role="button"
              tabIndex={0}
              aria-pressed={filters.roles.includes(role.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleRole(role.value);
                }
              }}
              title={role.isCustom ? 'Custom Role' : undefined}
            >
              {role.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};