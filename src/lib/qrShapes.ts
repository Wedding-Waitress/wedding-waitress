export const QR_SHAPES = [
  // Basic Shapes
  { value: 'square', label: 'Square', category: 'basic' },
  { value: 'circle', label: 'Circle', category: 'basic' },
  { value: 'rounded', label: 'Rounded Square', category: 'basic' },
  { value: 'diamond', label: 'Diamond', category: 'basic' },
  { value: 'hexagon', label: 'Hexagon', category: 'basic' },
  { value: 'octagon', label: 'Octagon', category: 'basic' },
  { value: 'triangle', label: 'Triangle', category: 'basic' },
  { value: 'pentagon', label: 'Pentagon', category: 'basic' },
  
  // Artistic Shapes
  { value: 'heart', label: 'Heart', category: 'artistic' },
  { value: 'star', label: 'Star', category: 'artistic' },
  { value: 'flower', label: 'Flower', category: 'artistic' },
  { value: 'leaf', label: 'Leaf', category: 'artistic' },
  { value: 'butterfly', label: 'Butterfly', category: 'artistic' },
  { value: 'cloud', label: 'Cloud', category: 'artistic' },
  { value: 'lightning', label: 'Lightning', category: 'artistic' },
  { value: 'arrow', label: 'Arrow', category: 'artistic' },
  { value: 'cross', label: 'Cross', category: 'artistic' },
  { value: 'plus', label: 'Plus', category: 'artistic' },
  { value: 'infinity', label: 'Infinity', category: 'artistic' },
  { value: 'custom', label: 'Custom Upload', category: 'artistic' },
];

export const QR_PATTERNS = [
  { value: 'basic', label: 'Basic Squares', category: 'classic' },
  { value: 'dots', label: 'Dots', category: 'classic' },
  { value: 'rounded-dots', label: 'Rounded Dots', category: 'classic' },
  { value: 'lines', label: 'Lines', category: 'geometric' },
  { value: 'waves', label: 'Waves', category: 'geometric' },
  { value: 'diagonal', label: 'Diagonal', category: 'geometric' },
  { value: 'grid', label: 'Grid', category: 'geometric' },
  { value: 'honeycomb', label: 'Honeycomb', category: 'geometric' },
  { value: 'spiral', label: 'Spiral', category: 'artistic' },
  { value: 'mosaic', label: 'Mosaic', category: 'artistic' },
];

export const COLOR_PALETTES = [
  { 
    value: 'default', 
    label: 'Default', 
    colors: { foreground: '#000000', background: '#ffffff' } 
  },
  { 
    value: 'wedding', 
    label: 'Wedding', 
    colors: { foreground: '#8b5a3c', background: '#f7f3f0' } 
  },
  { 
    value: 'corporate', 
    label: 'Corporate', 
    colors: { foreground: '#1e40af', background: '#f8fafc' } 
  },
  { 
    value: 'nature', 
    label: 'Nature', 
    colors: { foreground: '#166534', background: '#f0fdf4' } 
  },
  { 
    value: 'vintage', 
    label: 'Vintage', 
    colors: { foreground: '#92400e', background: '#fef7ed' } 
  },
  { 
    value: 'modern', 
    label: 'Modern', 
    colors: { foreground: '#6366f1', background: '#fafaff' } 
  },
  { 
    value: 'elegant', 
    label: 'Elegant', 
    colors: { foreground: '#374151', background: '#f9fafb' } 
  },
  { 
    value: 'bold', 
    label: 'Bold', 
    colors: { foreground: '#dc2626', background: '#fefefe' } 
  }
];

export const CORNER_STYLES = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circular', label: 'Circular' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'star', label: 'Star' },
];

export const BORDER_STYLES = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'shadow', label: 'Shadow' },
];

export const OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG', extension: 'png' },
  { value: 'jpg', label: 'JPG', extension: 'jpg' },
  { value: 'svg', label: 'SVG', extension: 'svg' },
  { value: 'pdf', label: 'PDF', extension: 'pdf' },
];

export const OUTPUT_SIZES = [
  { value: 256, label: '256×256 (Small)' },
  { value: 512, label: '512×512 (Medium)' },
  { value: 1024, label: '1024×1024 (Large)' },
  { value: 2048, label: '2048×2048 (Extra Large)' },
];