import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/enhanced-button";

interface RelationBadgeProps {
  display: string;
  partner: string;
  role: string;
  partnerName?: string;
  onClick: () => void;
  isEmpty?: boolean;
}

export const RelationBadge: React.FC<RelationBadgeProps> = ({
  display,
  partner,
  role,
  partnerName,
  onClick,
  isEmpty = false
}) => {
  if (isEmpty || !display) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">—</span>
        <Button
          variant="link"
          size="sm"
          onClick={onClick}
          className="h-auto p-0 text-xs text-primary hover:text-primary/80"
        >
          Set
        </Button>
      </div>
    );
  }

  const parts = display.split(' — ');
  const displayPartner = parts[0] || partnerName;
  const displayRole = parts[1] || role;

  return (
    <div 
      className="flex items-center cursor-pointer group"
      onClick={onClick}
    >
      <Badge 
        variant="secondary" 
        className="px-2 py-1 text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
      >
        {displayPartner}/{displayRole}
      </Badge>
    </div>
  );
};