export interface PlaceCardTemplate {
  id: string;
  name: string;
  category: 'classic' | 'floral' | 'elegant' | 'modern' | 'watercolor';
  preview: string;
  styles: {
    font_family: string;
    font_color: string;
    background_color: string;
    border_style?: string;
    decorative_elements?: string;
  };
}

export const PLACE_CARD_TEMPLATES: PlaceCardTemplate[] = [
  // Classic/Minimalist
  {
    id: 'classic-simple',
    name: 'Classic Simple',
    category: 'classic',
    preview: '/api/placeholder/120/80',
    styles: {
      font_family: 'Inter',
      font_color: '#1f2937',
      background_color: '#ffffff',
      border_style: 'simple',
    },
  },
  {
    id: 'classic-bordered',
    name: 'Classic Bordered',
    category: 'classic',
    preview: '/api/placeholder/120/80',
    styles: {
      font_family: 'Roboto',
      font_color: '#374151',
      background_color: '#f9fafb',
      border_style: 'double',
    },
  },
  
  // Floral/Botanical
  {
    id: 'floral-elegant',
    name: 'Floral Elegant',
    category: 'floral',
    preview: '/api/placeholder/120/80',
    styles: {
      font_family: 'Playfair Display',
      font_color: '#065f46',
      background_color: '#f0fdf4',
      decorative_elements: 'leaves',
    },
  },
  {
    id: 'botanical-modern',
    name: 'Botanical Modern',
    category: 'floral',
    preview: '/api/placeholder/120/80',
    styles: {
      font_family: 'Lato',
      font_color: '#166534',
      background_color: '#ffffff',
      decorative_elements: 'botanical',
    },
  },
  
  // Elegant/Script
  {
    id: 'elegant-script',
    name: 'Elegant Script',
    category: 'elegant',
    preview: '/api/placeholder/120/80',
    styles: {
      font_family: 'Dancing Script',
      font_color: '#7c2d12',
      background_color: '#fefbf3',
      border_style: 'ornate',
    },
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    category: 'elegant',
    preview: '/api/placeholder/120/80',
    styles: {
      font_family: 'Great Vibes',
      font_color: '#92400e',
      background_color: '#fffbeb',
      decorative_elements: 'gold-accent',
    },
  },
  
  // Modern/Geometric
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    category: 'modern',
    preview: '/api/placeholder/120/80',
    styles: {
      font_family: 'Montserrat',
      font_color: '#111827',
      background_color: '#ffffff',
      border_style: 'geometric',
    },
  },
  {
    id: 'geometric-pattern',
    name: 'Geometric Pattern',
    category: 'modern',
    preview: '/api/placeholder/120/80',
    styles: {
      font_family: 'Poppins',
      font_color: '#1e40af',
      background_color: '#f8fafc',
      decorative_elements: 'geometric',
    },
  },
  
  // Watercolor/Artistic
  {
    id: 'watercolor-soft',
    name: 'Watercolor Soft',
    category: 'watercolor',
    preview: '/api/placeholder/120/80',
    styles: {
      font_family: 'Open Sans',
      font_color: '#4338ca',
      background_color: '#faf5ff',
      decorative_elements: 'watercolor',
    },
  },
  {
    id: 'artistic-brush',
    name: 'Artistic Brush',
    category: 'watercolor',
    preview: '/api/placeholder/120/80',
    styles: {
      font_family: 'Pacifico',
      font_color: '#be185d',
      background_color: '#fdf2f8',
      decorative_elements: 'brush-stroke',
    },
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'classic', name: 'Classic & Minimalist', icon: '📄' },
  { id: 'floral', name: 'Floral & Botanical', icon: '🌿' },
  { id: 'elegant', name: 'Elegant & Script', icon: '✨' },
  { id: 'modern', name: 'Modern & Geometric', icon: '🔷' },
  { id: 'watercolor', name: 'Watercolor & Artistic', icon: '🎨' },
] as const;

export const getTemplatesByCategory = (category: string) => {
  return PLACE_CARD_TEMPLATES.filter(template => template.category === category);
};

export const getTemplateById = (id: string) => {
  return PLACE_CARD_TEMPLATES.find(template => template.id === id);
};