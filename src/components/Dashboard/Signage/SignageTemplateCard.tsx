import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Eye, Plus } from "lucide-react";
import { TemplateType } from '@/lib/signageTemplateEngine';

interface SignageTemplateCardProps {
  templateType: TemplateType;
  name: string;
  description: string;
  icon: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

export const SignageTemplateCard: React.FC<SignageTemplateCardProps> = ({
  templateType,
  name,
  description,
  icon,
  onSelect,
  disabled = false
}) => {
  const getTemplatePreview = (type: TemplateType) => {
    // Return a simple visual representation for each template type
    const commonClasses = "w-full h-24 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center";
    
    switch (type) {
      case 'table-tent':
        return (
          <div className={commonClasses}>
            <div className="text-xs text-muted-foreground">A-Frame Card</div>
          </div>
        );
      case 'welcome-sign':
        return (
          <div className={`${commonClasses} bg-primary/10`}>
            <div className="text-xs text-muted-foreground">Large Welcome</div>
          </div>
        );
      case 'standing-sign':
        return (
          <div className={`${commonClasses} bg-secondary/10`}>
            <div className="text-xs text-muted-foreground">Floor Stand</div>
          </div>
        );
      case 'menu-card':
        return (
          <div className={commonClasses}>
            <div className="text-xs text-muted-foreground">Menu Card</div>
          </div>
        );
      case 'place-card':
        return (
          <div className={`${commonClasses} bg-accent/10`}>
            <div className="text-xs text-muted-foreground">Place Card</div>
          </div>
        );
      case 'poster-sign':
        return (
          <div className={`${commonClasses} bg-muted/20`}>
            <div className="text-xs text-muted-foreground">Wall Poster</div>
          </div>
        );
      default:
        return (
          <div className={commonClasses}>
            <div className="text-xs text-muted-foreground">Template</div>
          </div>
        );
    }
  };

  return (
    <Card className={`group cursor-pointer transition-all duration-300 hover:shadow-elevated ${disabled ? 'opacity-50' : 'hover:scale-102'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-primary">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Template Preview */}
        <div className="mb-4">
          {getTemplatePreview(templateType)}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={disabled}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="gradient"
            size="sm"
            className="flex-1"
            onClick={onSelect}
            disabled={disabled}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};