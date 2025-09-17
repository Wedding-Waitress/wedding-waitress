import { AdvancedQRGenerator } from './advancedQRGenerator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type TemplateType = 
  | 'modern-minimalist'
  | 'elegant-script' 
  | 'rustic-wood'
  | 'luxury-gold'
  | 'floral-border'
  | 'geometric'
  | 'vintage-classic'
  | 'contemporary'
  | 'classic-formal'
  | 'artistic-modern';

export interface TemplateDimensions {
  width: number;
  height: number;
  units: 'mm' | 'px';
}

export interface SignageSettings {
  eventName: string;
  eventDate: string;
  eventVenue: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'Arial' | 'Georgia' | 'Times' | 'Helvetica' | 'Garamond' | 'Poppins';
  includeQR: boolean;
  customMessage: string;
  logoUrl: string;
  headerImageUrl: string;
  backgroundImageUrl: string;
  textAlignment: 'left' | 'center' | 'right';
  paperSize: 'A5' | 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
}

export interface SignageTemplate {
  id: string;
  type: TemplateType;
  name: string;
  eventId: string;
  settings: SignageSettings;
  dimensions: TemplateDimensions;
  createdAt: Date;
  updatedAt: Date;
}

export class SignageTemplateEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private qrGenerator: AdvancedQRGenerator;

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get 2D context from canvas');
    }
    this.ctx = ctx;
    this.qrGenerator = new AdvancedQRGenerator(200);
  }

  async generateTemplate(
    template: SignageTemplate, 
    guestLookupUrl?: string
  ): Promise<string> {
    // Set canvas dimensions based on template
    const dpi = 300; // High resolution for print
    const mmToPx = (mm: number) => (mm * dpi) / 25.4;

    if (template.dimensions.units === 'mm') {
      this.canvas.width = mmToPx(template.dimensions.width);
      this.canvas.height = mmToPx(template.dimensions.height);
    } else {
      this.canvas.width = template.dimensions.width;
      this.canvas.height = template.dimensions.height;
    }

    // Clear canvas
    this.ctx.fillStyle = template.settings.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render template based on type
    switch (template.type) {
      case 'modern-minimalist':
        await this.renderModernMinimalist(template, guestLookupUrl);
        break;
      case 'elegant-script':
        await this.renderElegantScript(template, guestLookupUrl);
        break;
      case 'rustic-wood':
        await this.renderRusticWood(template, guestLookupUrl);
        break;
      case 'luxury-gold':
        await this.renderLuxuryGold(template, guestLookupUrl);
        break;
      case 'floral-border':
        await this.renderFloralBorder(template, guestLookupUrl);
        break;
      case 'geometric':
        await this.renderGeometric(template, guestLookupUrl);
        break;
      case 'vintage-classic':
        await this.renderVintageClassic(template, guestLookupUrl);
        break;
      case 'contemporary':
        await this.renderContemporary(template, guestLookupUrl);
        break;
      case 'classic-formal':
        await this.renderClassicFormal(template, guestLookupUrl);
        break;
      case 'artistic-modern':
        await this.renderArtisticModern(template, guestLookupUrl);
        break;
    }

    return this.canvas.toDataURL('image/png');
  }

  // Modern Minimalist Template
  private async renderModernMinimalist(template: SignageTemplate, qrUrl?: string) {
    const { width, height } = this.canvas;
    const { settings } = template;
    
    // Background
    await this.renderBackground(template);
    
    // Header section with optional image
    if (settings.headerImageUrl) {
      await this.drawHeaderImage(settings.headerImageUrl, width, height * 0.25);
    }
    
    // Clean header bar
    this.ctx.fillStyle = settings.primaryColor;
    this.ctx.fillRect(0, 0, width, height * 0.15);
    
    // Event name in header
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `300 ${this.getFontSize(settings.fontSize, width) * 1.5}px ${settings.fontFamily}`;
    this.ctx.textAlign = settings.textAlignment;
    const textX = this.getTextX(width, settings.textAlignment);
    this.ctx.fillText(settings.eventName, textX, height * 0.1);
    
    // Date in elegant format
    this.ctx.fillStyle = settings.textColor;
    this.ctx.font = `400 ${this.getFontSize(settings.fontSize, width)}px ${settings.fontFamily}`;
    this.ctx.fillText(this.formatDate(settings.eventDate), textX, height * 0.25);
    
    // QR code with clean spacing
    if (settings.includeQR && qrUrl) {
      await this.addQRCode(qrUrl, width * 0.35, width / 2 - width * 0.175, height * 0.35);
    }
    
    // Welcome message
    if (settings.customMessage) {
      this.ctx.font = `300 ${this.getFontSize(settings.fontSize, width) * 0.7}px ${settings.fontFamily}`;
      this.ctx.fillText(settings.customMessage, textX, height * 0.8);
    }
  }

  // Elegant Script Template
  private async renderElegantScript(template: SignageTemplate, qrUrl?: string) {
    const { width, height } = this.canvas;
    const { settings } = template;
    
    await this.renderBackground(template);
    
    // Decorative border
    this.ctx.strokeStyle = settings.primaryColor;
    this.ctx.lineWidth = 8;
    this.ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);
    
    // Inner decorative line
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(width * 0.08, height * 0.08, width * 0.84, height * 0.84);
    
    // Event name in script style
    this.ctx.fillStyle = settings.primaryColor;
    this.ctx.font = `italic bold ${this.getFontSize(settings.fontSize, width) * 1.8}px ${settings.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(settings.eventName, width / 2, height * 0.25);
    
    // Date
    this.ctx.fillStyle = settings.textColor;
    this.ctx.font = `italic ${this.getFontSize(settings.fontSize, width) * 0.8}px ${settings.fontFamily}`;
    this.ctx.fillText(this.formatDate(settings.eventDate), width / 2, height * 0.35);
    
    // QR code
    if (settings.includeQR && qrUrl) {
      await this.addQRCode(qrUrl, width * 0.3, width / 2 - width * 0.15, height * 0.45);
    }
    
    // Custom message
    if (settings.customMessage) {
      this.ctx.font = `italic ${this.getFontSize(settings.fontSize, width) * 0.6}px ${settings.fontFamily}`;
      this.ctx.fillText(settings.customMessage, width / 2, height * 0.85);
    }
  }

  // Rustic Wood Template
  private async renderRusticWood(template: SignageTemplate, qrUrl?: string) {
    const { width, height } = this.canvas;
    const { settings } = template;
    
    // Wood texture background (simulated)
    const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#8B4513');
    gradient.addColorStop(0.5, '#A0522D');
    gradient.addColorStop(1, '#8B4513');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
    
    // Wood grain effect
    this.ctx.strokeStyle = '#654321';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < height; i += 20) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(width, i + Math.sin(i * 0.1) * 5);
      this.ctx.stroke();
    }
    
    // Event name with shadow effect
    this.ctx.fillStyle = '#000000';
    this.ctx.font = `bold ${this.getFontSize(settings.fontSize, width) * 1.6}px ${settings.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(settings.eventName, width / 2 + 2, height * 0.22);
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(settings.eventName, width / 2, height * 0.2);
    
    // Date
    this.ctx.fillStyle = '#F5F5DC';
    this.ctx.font = `${this.getFontSize(settings.fontSize, width)}px ${settings.fontFamily}`;
    this.ctx.fillText(this.formatDate(settings.eventDate), width / 2, height * 0.35);
    
    // QR code with wooden frame effect
    if (settings.includeQR && qrUrl) {
      const qrSize = width * 0.3;
      const qrX = width / 2 - qrSize / 2;
      const qrY = height * 0.45;
      
      // Wooden frame
      this.ctx.fillStyle = '#654321';
      this.ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
      
      await this.addQRCode(qrUrl, qrSize, qrX, qrY);
    }
  }

  // Additional template methods would continue here...
  private async renderLuxuryGold(template: SignageTemplate, qrUrl?: string) {
    const { width, height } = this.canvas;
    const { settings } = template;
    
    // Luxury gold gradient background
    const gradient = this.ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.3, '#FFA500');
    gradient.addColorStop(1, '#B8860B');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
    
    // Ornate border
    this.ctx.strokeStyle = '#8B4513';
    this.ctx.lineWidth = 12;
    this.ctx.strokeRect(width * 0.03, height * 0.03, width * 0.94, height * 0.94);
    
    // Inner gold border
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(width * 0.06, height * 0.06, width * 0.88, height * 0.88);
    
    // Event name in luxury style
    this.ctx.fillStyle = '#8B4513';
    this.ctx.font = `bold ${this.getFontSize(settings.fontSize, width) * 1.7}px ${settings.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(settings.eventName, width / 2, height * 0.25);
    
    // Date
    this.ctx.fillStyle = '#654321';
    this.ctx.font = `${this.getFontSize(settings.fontSize, width) * 0.9}px ${settings.fontFamily}`;
    this.ctx.fillText(this.formatDate(settings.eventDate), width / 2, height * 0.35);
    
    // QR code
    if (settings.includeQR && qrUrl) {
      await this.addQRCode(qrUrl, width * 0.3, width / 2 - width * 0.15, height * 0.45);
    }
  }

  // Placeholder methods for remaining templates
  private async renderFloralBorder(template: SignageTemplate, qrUrl?: string) {
    // Implement floral border design
    await this.renderModernMinimalist(template, qrUrl); // Temporary fallback
  }

  private async renderGeometric(template: SignageTemplate, qrUrl?: string) {
    // Implement geometric design
    await this.renderModernMinimalist(template, qrUrl); // Temporary fallback
  }

  private async renderVintageClassic(template: SignageTemplate, qrUrl?: string) {
    // Implement vintage design
    await this.renderModernMinimalist(template, qrUrl); // Temporary fallback
  }

  private async renderContemporary(template: SignageTemplate, qrUrl?: string) {
    // Implement contemporary design
    await this.renderModernMinimalist(template, qrUrl); // Temporary fallback
  }

  private async renderClassicFormal(template: SignageTemplate, qrUrl?: string) {
    // Implement classic formal design
    await this.renderModernMinimalist(template, qrUrl); // Temporary fallback
  }

  private async renderArtisticModern(template: SignageTemplate, qrUrl?: string) {
    // Implement artistic modern design
    await this.renderModernMinimalist(template, qrUrl); // Temporary fallback
  }

  // Helper methods for template rendering
  private async renderBackground(template: SignageTemplate) {
    const { width, height } = this.canvas;
    const { settings } = template;
    
    if (settings.backgroundImageUrl) {
      await this.drawBackgroundImage(settings.backgroundImageUrl, width, height);
    } else {
      this.ctx.fillStyle = settings.backgroundColor;
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private async drawBackgroundImage(imageUrl: string, width: number, height: number) {
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });
      
      // Add semi-transparent overlay for text readability
      this.ctx.drawImage(img, 0, 0, width, height);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.fillRect(0, 0, width, height);
    } catch (error) {
      console.error('Error loading background image:', error);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private async drawHeaderImage(imageUrl: string, width: number, height: number) {
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });
      
      // Draw header image with proper aspect ratio
      const aspectRatio = img.width / img.height;
      const headerHeight = height;
      const headerWidth = headerHeight * aspectRatio;
      
      const x = (width - headerWidth) / 2;
      this.ctx.drawImage(img, x, 0, headerWidth, headerHeight);
    } catch (error) {
      console.error('Error loading header image:', error);
    }
  }

  private getTextX(width: number, alignment: 'left' | 'center' | 'right'): number {
    switch (alignment) {
      case 'left': return width * 0.1;
      case 'right': return width * 0.9;
      case 'center':
      default: return width / 2;
    }
  }

  // Paper size dimensions in mm
  private getPaperDimensions(paperSize: string): { width: number; height: number } {
    switch (paperSize) {
      case 'A5': return { width: 148, height: 210 };
      case 'A4': return { width: 210, height: 297 };
      case 'A3': return { width: 297, height: 420 };
      case 'A2': return { width: 420, height: 594 };
      case 'A1': return { width: 594, height: 841 };
      case 'A0': return { width: 841, height: 1189 };
      default: return { width: 210, height: 297 }; // A4 default
    }
  }

  private async addQRCode(url: string, size: number, x: number, y: number) {
    try {
      // Generate QR code with basic settings
      const qrDataUrl = await this.qrGenerator.generate(url, {
        background_color: '#ffffff',
        foreground_color: '#000000',
        shape: 'square',
        pattern: 'square',
        pattern_style: 'solid',
        corner_style: 'square',
        has_scan_text: false,
        scan_text: '',
        gradient_type: 'none',
        gradient_colors: [],
        border_style: 'none',
        border_width: 0,
        border_color: '#000000',
        shadow_enabled: false,
        shadow_blur: 0,
        shadow_color: '#000000',
        center_image_size: 0,
        background_opacity: 1,
        output_size: 512,
        output_format: 'png',
        color_palette: 'default',
        advanced_settings: {},
        event_id: '',
        user_id: ''
      } as any);

      // Create image and draw to canvas
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = qrDataUrl;
      });

      this.ctx.drawImage(img, x, y, size, size);
    } catch (error) {
      console.error('Error adding QR code:', error);
      // Draw placeholder
      this.ctx.strokeStyle = '#cccccc';
      this.ctx.strokeRect(x, y, size, size);
      this.ctx.fillStyle = '#eeeeee';
      this.ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    }
  }

  private getFontSize(size: 'small' | 'medium' | 'large', canvasWidth: number): number {
    const baseSize = canvasWidth / 20; // Responsive to canvas size
    switch (size) {
      case 'small': return baseSize * 0.8;
      case 'medium': return baseSize;
      case 'large': return baseSize * 1.2;
    }
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  }

  async exportToPDF(template: SignageTemplate, guestLookupUrl?: string): Promise<Blob> {
    const imageDataUrl = await this.generateTemplate(template, guestLookupUrl);
    
    const pdf = new jsPDF({
      orientation: template.dimensions.width > template.dimensions.height ? 'landscape' : 'portrait',
      unit: template.dimensions.units,
      format: [template.dimensions.width, template.dimensions.height]
    });

    pdf.addImage(
      imageDataUrl, 
      'PNG', 
      0, 
      0, 
      template.dimensions.width, 
      template.dimensions.height
    );

    return pdf.output('blob');
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  async exportAsImage(format: 'png' | 'jpeg' = 'png', quality: number = 0.9): Promise<Blob> {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob!);
      }, `image/${format}`, quality);
    });
  }
}