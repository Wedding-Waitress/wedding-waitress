import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { InvitationTemplate } from '@/hooks/useInvitationTemplates';

interface Props {
  templates: InvitationTemplate[];
  loading: boolean;
  onSelect: (template: InvitationTemplate) => void;
}

export const TemplateGallery: React.FC<Props> = ({ templates, loading, onSelect }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-[148/210] rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No templates available yet</p>
        <p className="text-sm mt-1">Templates will be uploaded by the admin soon.</p>
      </div>
    );
  }

  // Group by category
  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div className="space-y-8">
      {categories.map(category => {
        const catTemplates = templates.filter(t => t.category === category);
        return (
          <div key={category}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {catTemplates.map(template => (
                <Card
                  key={template.id}
                  className="overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => onSelect(template)}
                >
                  <div className="relative aspect-[148/210] bg-muted">
                    <img
                      src={template.thumbnail_url || template.background_url}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {template.orientation === 'portrait' ? '↕' : '↔'}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-2">
                    <p className="text-sm font-medium truncate">{template.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
