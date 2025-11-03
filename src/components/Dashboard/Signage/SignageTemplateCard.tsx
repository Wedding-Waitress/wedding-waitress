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
      case 'modern-minimalist':
        return (
          <div className={`${commonClasses} bg-gradient-to-r from-slate-50 to-gray-100`}>
            <div className="text-xs text-muted-foreground">Modern & Clean</div>
          </div>
        );
      case 'elegant-script':
        return (
          <div className={`${commonClasses} bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200`}>
            <div className="text-xs text-muted-foreground italic">Elegant Script</div>
          </div>
        );
      case 'rustic-wood':
        return (
          <div className={`${commonClasses} bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300`}>
            <div className="text-xs text-muted-foreground">Rustic Wood</div>
          </div>
        );
      case 'luxury-gold':
        return (
          <div className={`${commonClasses} bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-300`}>
            <div className="text-xs text-muted-foreground font-semibold">Luxury Gold</div>
          </div>
        );
      case 'floral-border':
        return (
          <div className={`${commonClasses} bg-gradient-to-r from-green-50 to-emerald-50 border-green-200`}>
            <div className="text-xs text-muted-foreground">Floral Design</div>
          </div>
        );
      case 'geometric':
        return (
          <div className={`${commonClasses} bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200`}>
            <div className="text-xs text-muted-foreground">Geometric</div>
          </div>
        );
      case 'vintage-classic':
        return (
          <div className={`${commonClasses} bg-gradient-to-r from-stone-100 to-neutral-100 border-stone-300`}>
            <div className="text-xs text-muted-foreground">Vintage Style</div>
          </div>
        );
      case 'contemporary':
        return (
          <div className={`${commonClasses} bg-gradient-to-r from-cyan-50 to-teal-50 border-cyan-200`}>
            <div className="text-xs text-muted-foreground">Contemporary</div>
          </div>
        );
      case 'classic-formal':
        return (
          <div className={`${commonClasses} bg-gradient-to-r from-gray-50 to-slate-100 border-gray-300`}>
            <div className="text-xs text-muted-foreground">Classic Formal</div>
          </div>
        );
      case 'artistic-modern':
        return (
          <div className={`${commonClasses} bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200`}>
            <div className="text-xs text-muted-foreground">Artistic Modern</div>
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
    <Card className={`ww-box group cursor-pointer transition-all duration-300 hover:shadow-elevated ${disabled ? 'opacity-50' : 'hover:scale-102'}`}>
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
        
        {/* Action Button */}
        <div className="flex">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={onSelect}
            disabled={disabled}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview & Create
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};