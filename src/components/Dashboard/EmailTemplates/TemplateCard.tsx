import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Check, Pencil, Trash2, Copy, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    description?: string;
    type: 'system' | 'custom';
    preview?: React.ReactNode;
    created_at?: string;
  };
  onPreview: () => void;
  onUse: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSendTest?: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPreview,
  onUse,
  onEdit,
  onDelete,
  onDuplicate,
  onSendTest,
}) => {
  return (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
      <CardContent className="p-4 space-y-3">
        {/* Preview Area */}
        <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
          {template.preview ? (
            <div className="w-full h-full flex items-center justify-center p-2">
              {template.preview}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
              <span className="text-4xl font-serif text-primary/20">{template.name.charAt(0)}</span>
            </div>
          )}
          
          {/* Hover Overlay with Actions */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onPreview}
              className="bg-white/90 hover:bg-white"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            {onSendTest && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onSendTest}
                className="bg-white/90 hover:bg-white"
              >
                <Mail className="w-4 h-4 mr-1" />
                Test
              </Button>
            )}
            <Button
              size="sm"
              variant="default"
              onClick={onUse}
              className="bg-primary hover:bg-primary/90"
            >
              <Check className="w-4 h-4 mr-1" />
              Use
            </Button>
          </div>
        </div>

        {/* Template Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{template.name}</h3>
              {template.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
              )}
            </div>
            <Badge variant={template.type === 'system' ? 'secondary' : 'default'} className="shrink-0">
              {template.type === 'system' ? 'System' : 'Custom'}
            </Badge>
          </div>

          {/* Action Buttons for Custom Templates */}
          {template.type === 'custom' && (
            <div className="flex gap-1 pt-2 border-t">
              {onEdit && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={onEdit}
                  className="flex-1"
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
              {onDuplicate && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={onDuplicate}
                  className="flex-1"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              )}
              {onDelete && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={onDelete}
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
