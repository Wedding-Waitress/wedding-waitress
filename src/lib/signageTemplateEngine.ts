import { AdvancedQRGenerator } from './advancedQRGenerator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type TemplateType = 
  | 'table-tent' 
  | 'welcome-sign' 
  | 'standing-sign' 
  | 'menu-card' 
  | 'place-card' 
  | 'poster-sign';

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
  includeQR: boolean;
  customMessage: string;
  logoUrl: string;
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
      case 'table-tent':
        await this.renderTableTent(template, guestLookupUrl);
        break;
      case 'welcome-sign':
        await this.renderWelcomeSign(template, guestLookupUrl);
        break;
      case 'standing-sign':
        await this.renderStandingSign(template, guestLookupUrl);
        break;
      case 'menu-card':
        await this.renderMenuCard(template, guestLookupUrl);
        break;
      case 'place-card':
        await this.renderPlaceCard(template, guestLookupUrl);
        break;
      case 'poster-sign':
        await this.renderPosterSign(template, guestLookupUrl);
        break;
    }

    return this.canvas.toDataURL('image/png');
  }

  private async renderTableTent(template: SignageTemplate, qrUrl?: string) {
    const { width, height } = this.canvas;
    const { settings } = template;
    
    // Add gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, settings.primaryColor);
    gradient.addColorStop(1, settings.backgroundColor);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Add event name
    this.ctx.fillStyle = settings.textColor;
    this.ctx.font = `bold ${this.getFontSize(settings.fontSize, width)}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(settings.eventName, width / 2, height * 0.3);

    // Add date
    this.ctx.font = `${this.getFontSize(settings.fontSize, width) * 0.6}px Arial`;
    const formattedDate = this.formatDate(settings.eventDate);
    this.ctx.fillText(formattedDate, width / 2, height * 0.4);

    // Add QR code if enabled
    if (settings.includeQR && qrUrl) {
      await this.addQRCode(qrUrl, width * 0.3, width / 2 - width * 0.15, height * 0.5);
    }

    // Add custom message
    if (settings.customMessage) {
      this.ctx.font = `${this.getFontSize(settings.fontSize, width) * 0.5}px Arial`;
      this.ctx.fillText(settings.customMessage, width / 2, height * 0.85);
    }

    // Add fold line indicator
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, height / 2);
    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private async renderWelcomeSign(template: SignageTemplate, qrUrl?: string) {
    const { width, height } = this.canvas;
    const { settings } = template;

    // Large welcome layout
    this.ctx.fillStyle = settings.primaryColor;
    this.ctx.fillRect(0, 0, width, height * 0.2);

    // Welcome text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${this.getFontSize(settings.fontSize, width) * 2}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('WELCOME', width / 2, height * 0.12);

    // Event details
    this.ctx.fillStyle = settings.textColor;
    this.ctx.font = `bold ${this.getFontSize(settings.fontSize, width) * 1.5}px Arial`;
    this.ctx.fillText(settings.eventName, width / 2, height * 0.35);

    this.ctx.font = `${this.getFontSize(settings.fontSize, width)}px Arial`;
    this.ctx.fillText(this.formatDate(settings.eventDate), width / 2, height * 0.45);

    if (settings.eventVenue) {
      this.ctx.fillText(settings.eventVenue, width / 2, height * 0.55);
    }

    // QR code
    if (settings.includeQR && qrUrl) {
      await this.addQRCode(qrUrl, width * 0.25, width / 2 - width * 0.125, height * 0.65);
    }
  }

  private async renderStandingSign(template: SignageTemplate, qrUrl?: string) {
    const { width, height } = this.canvas;
    const { settings } = template;

    // Header section
    this.ctx.fillStyle = settings.primaryColor;
    this.ctx.fillRect(0, 0, width, height * 0.25);

    // Event name in header
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${this.getFontSize(settings.fontSize, width) * 1.2}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(settings.eventName, width / 2, height * 0.15);

    // Main content area
    this.ctx.fillStyle = settings.textColor;
    this.ctx.font = `${this.getFontSize(settings.fontSize, width)}px Arial`;
    this.ctx.fillText('Scan to find your table', width / 2, height * 0.4);

    // Large QR code
    if (settings.includeQR && qrUrl) {
      await this.addQRCode(qrUrl, width * 0.4, width / 2 - width * 0.2, height * 0.45);
    }
  }

  private async renderMenuCard(template: SignageTemplate, qrUrl?: string) {
    const { width, height } = this.canvas;
    const { settings } = template;

    // Simple menu card layout
    this.ctx.fillStyle = settings.textColor;
    this.ctx.font = `bold ${this.getFontSize(settings.fontSize, width)}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('MENU', width / 2, height * 0.2);

    this.ctx.font = `${this.getFontSize(settings.fontSize, width) * 0.6}px Arial`;
    this.ctx.fillText('Scan for digital menu', width / 2, height * 0.35);

    // QR code
    if (settings.includeQR && qrUrl) {
      await this.addQRCode(qrUrl, width * 0.5, width / 2 - width * 0.25, height * 0.45);
    }
  }

  private async renderPlaceCard(template: SignageTemplate, qrUrl?: string) {
    const { width, height } = this.canvas;
    const { settings } = template;

    // Simple place card
    this.ctx.fillStyle = settings.primaryColor;
    this.ctx.fillRect(0, 0, width, height * 0.3);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `${this.getFontSize(settings.fontSize, width) * 0.8}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Guest Name', width / 2, height * 0.2);

    // Small QR code
    if (settings.includeQR && qrUrl) {
      await this.addQRCode(qrUrl, width * 0.3, width / 2 - width * 0.15, height * 0.4);
    }
  }

  private async renderPosterSign(template: SignageTemplate, qrUrl?: string) {
    const { width, height } = this.canvas;
    const { settings } = template;

    // Similar to welcome sign but poster proportions
    this.ctx.fillStyle = settings.primaryColor;
    this.ctx.fillRect(0, 0, width, height * 0.15);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${this.getFontSize(settings.fontSize, width) * 1.5}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(settings.eventName, width / 2, height * 0.1);

    this.ctx.fillStyle = settings.textColor;
    this.ctx.font = `${this.getFontSize(settings.fontSize, width)}px Arial`;
    this.ctx.fillText('Find Your Table', width / 2, height * 0.3);

    // QR code
    if (settings.includeQR && qrUrl) {
      await this.addQRCode(qrUrl, width * 0.3, width / 2 - width * 0.15, height * 0.4);
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