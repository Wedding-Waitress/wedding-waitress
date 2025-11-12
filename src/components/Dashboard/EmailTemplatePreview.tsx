import { Check } from 'lucide-react';
import { Card } from '@/components/ui/card';

type TemplateType = 'elegant' | 'modern' | 'rustic';

interface EmailTemplatePreviewProps {
  selectedTemplate: TemplateType;
  onSelectTemplate: (template: TemplateType) => void;
}

const templates = [
  {
    id: 'elegant' as TemplateType,
    name: 'Elegant',
    description: 'Classic sophistication with champagne gold accents',
    preview: (
      <div className="w-full h-32 rounded-lg border-2 border-[hsl(var(--border))] bg-gradient-to-br from-[#FFFFF0] to-[#FAF8F5] p-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-center border-t border-b border-[#D4AF37] py-2 px-4 mb-2">
            <p className="text-[10px] font-serif tracking-wider text-[#2C2416]">You're Cordially Invited</p>
          </div>
          <div className="w-16 h-16 border-2 border-[#D4AF37] bg-white flex items-center justify-center">
            <div className="w-12 h-12 bg-[#2C2416]" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'modern' as TemplateType,
    name: 'Modern',
    description: 'Bold gradients with contemporary design',
    preview: (
      <div className="w-full h-32 rounded-lg overflow-hidden border-2 border-[hsl(var(--border))]">
        <div className="h-10 bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
          <p className="text-[10px] font-bold text-white tracking-tight">You're Invited!</p>
        </div>
        <div className="bg-white p-3 flex flex-col items-center justify-center h-[calc(100%-2.5rem)]">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] p-1">
            <div className="w-full h-full bg-white rounded-lg flex items-center justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-[#667eea] to-[#764ba2]" />
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'rustic' as TemplateType,
    name: 'Rustic',
    description: 'Natural warmth with handcrafted charm',
    preview: (
      <div className="w-full h-32 rounded-lg border-4 border-[#8B4513] bg-gradient-to-br from-[#F5DEB3] to-[#E8D5B7] p-3 relative">
        <div className="absolute top-0 left-0 right-0 h-2 opacity-30" style={{ background: 'repeating-linear-gradient(90deg, #8B4513 0px, #8B4513 5px, transparent 5px, transparent 10px)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-2 opacity-30" style={{ background: 'repeating-linear-gradient(90deg, #8B4513 0px, #8B4513 5px, transparent 5px, transparent 10px)' }} />
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-[12px] font-cursive text-[#2D2013] mb-2" style={{ fontFamily: 'Dancing Script, cursive' }}>You're Invited!</p>
          <div className="w-16 h-16 border-2 border-dashed border-[#8B4513] bg-white/40 flex items-center justify-center relative">
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-[#F5DEB3] border border-[#8B4513] rounded-full" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#F5DEB3] border border-[#8B4513] rounded-full" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#F5DEB3] border border-[#8B4513] rounded-full" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#F5DEB3] border border-[#8B4513] rounded-full" />
            <div className="w-12 h-12 bg-[#8B4513]" />
          </div>
        </div>
      </div>
    ),
  },
];

export const EmailTemplatePreview = ({
  selectedTemplate,
  onSelectTemplate,
}: EmailTemplatePreviewProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {templates.map((template) => {
        const isSelected = selectedTemplate === template.id;
        return (
          <Card
            key={template.id}
            className={`relative cursor-pointer transition-all hover:shadow-lg ${
              isSelected ? 'ring-2 ring-primary shadow-lg' : ''
            }`}
            onClick={() => onSelectTemplate(template.id)}
          >
            {isSelected && (
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg z-10">
                <Check className="h-4 w-4" />
              </div>
            )}
            <div className="p-4 space-y-3">
              {template.preview}
              <div>
                <h4 className="font-semibold text-base">{template.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
