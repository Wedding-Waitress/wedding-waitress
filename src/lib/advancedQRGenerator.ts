import QRCode from 'qrcode';
import { QRCodeSettings } from '@/hooks/useQRCodeSettings';

export class AdvancedQRGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor(size: number = 512) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d')!;
  }

  async generate(url: string, settings: QRCodeSettings): Promise<string> {
    const { output_size = 512 } = settings;
    
    // Resize canvas if needed
    if (this.canvas.width !== output_size) {
      this.canvas.width = output_size;
      this.canvas.height = output_size;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Reset canvas state to prevent any filters/opacity issues
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.filter = 'none';
    this.ctx.globalAlpha = 1;
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.imageSmoothingEnabled = false;

    // Apply background
    await this.applyBackground(settings);

    // Generate base QR code data
    const qrMatrix = await this.getQRMatrix(url);
    
    // Apply QR pattern with shape and style (including finder patterns)
    this.applyQRPatternWithFinders(qrMatrix, settings);

    // Apply border effects
    this.applyBorder(settings);

    // Apply center image/logo
    if (settings.center_image_url) {
      await this.applyCenterImage(settings);
    }

    // Apply shadow effects
    if (settings.shadow_enabled) {
      this.applyShadow(settings);
    }

    // Apply scan text
    if (settings.has_scan_text && settings.scan_text) {
      this.applyScanText(settings);
    }

    return this.canvas.toDataURL(`image/${settings.output_format}`, 0.9);
  }

  private async getQRMatrix(url: string): Promise<boolean[][]> {
    // Use QRCode.create to get the actual module data (not pixel data)
    const qr = await QRCode.create(url, { errorCorrectionLevel: 'H' });
    const moduleCount = qr.modules.size;
    const modules = qr.modules.data;
    
    const matrix: boolean[][] = [];
    for (let y = 0; y < moduleCount; y++) {
      matrix[y] = [];
      for (let x = 0; x < moduleCount; x++) {
        // modules.data is a Uint8Array where each element is a module
        matrix[y][x] = modules[y * moduleCount + x] === 1;
      }
    }
    
    return matrix;
  }

  private async applyBackground(settings: QRCodeSettings) {
    if (settings.background_image_url) {
      await this.drawBackgroundImage(settings);
    } else if (settings.gradient_type !== 'none' && settings.gradient_colors.length > 0) {
      this.drawGradientBackground(settings);
    } else {
      this.ctx.fillStyle = settings.background_color;
      this.ctx.globalAlpha = settings.background_opacity;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalAlpha = 1;
    }
  }

  private async drawBackgroundImage(settings: QRCodeSettings) {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.ctx.globalAlpha = settings.background_opacity;
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 1;
        resolve();
      };
      img.onerror = () => resolve();
      img.src = settings.background_image_url!;
    });
  }

  private drawGradientBackground(settings: QRCodeSettings) {
    if (settings.gradient_colors.length < 2) return;

    let gradient: CanvasGradient;
    const { width, height } = this.canvas;

    switch (settings.gradient_type) {
      case 'linear':
        gradient = this.ctx.createLinearGradient(0, 0, width, height);
        break;
      case 'radial':
        gradient = this.ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.min(width, height)/2);
        break;
      case 'conic':
        gradient = this.ctx.createConicGradient(0, width/2, height/2);
        break;
      default:
        return;
    }

    settings.gradient_colors.forEach((color: any, index: number) => {
      const stop = index / (settings.gradient_colors.length - 1);
      gradient.addColorStop(stop, color.color || color);
    });

    this.ctx.fillStyle = gradient;
    this.ctx.globalAlpha = settings.background_opacity;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.globalAlpha = 1;
  }

  // Check if a cell is part of a finder pattern (works with module coordinates)
  private isFinderPatternCell(moduleX: number, moduleY: number, moduleCount: number): boolean {
    const finderSize = 7;
    
    // Top-left finder
    if (moduleX < finderSize && moduleY < finderSize) return true;
    // Top-right finder  
    if (moduleX >= moduleCount - finderSize && moduleY < finderSize) return true;
    // Bottom-left finder
    if (moduleX < finderSize && moduleY >= moduleCount - finderSize) return true;
    
    return false;
  }

  private applyQRPatternWithFinders(matrix: boolean[][], settings: QRCodeSettings) {
    const moduleCount = matrix.length;
    const cellSize = this.canvas.width / moduleCount;
    
    // Ensure no filters or opacity issues
    this.ctx.globalAlpha = 1;
    this.ctx.filter = 'none';

    // Draw regular data modules (excluding finder patterns)
    const dotsColor = settings.dots_color || settings.foreground_color;
    this.ctx.fillStyle = dotsColor;

    for (let y = 0; y < moduleCount; y++) {
      for (let x = 0; x < moduleCount; x++) {
        if (matrix[y][x] && !this.isFinderPatternCell(x, y, moduleCount)) {
          this.drawDotsModule(x * cellSize, y * cellSize, cellSize, settings);
        }
      }
    }

    // Draw finder patterns separately with custom colors
    this.drawFinderPattern(0, 0, cellSize, settings); // Top-left
    this.drawFinderPattern(moduleCount - 7, 0, cellSize, settings); // Top-right
    this.drawFinderPattern(0, moduleCount - 7, cellSize, settings); // Bottom-left
  }

  private drawDotsModule(x: number, y: number, size: number, settings: QRCodeSettings) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const dotsShape = settings.dots_shape || 'square';

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.fillStyle = settings.dots_color || settings.foreground_color;

    switch (dotsShape) {
      case 'circle':
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'rounded':
        const half = size * 0.4;
        const radius = size * 0.15;
        this.ctx.beginPath();
        this.ctx.roundRect(-half, -half, size * 0.8, size * 0.8, radius);
        this.ctx.fill();
        break;
      case 'diamond':
        const halfD = size * 0.4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -halfD);
        this.ctx.lineTo(halfD, 0);
        this.ctx.lineTo(0, halfD);
        this.ctx.lineTo(-halfD, 0);
        this.ctx.closePath();
        this.ctx.fill();
        break;
      case 'plus':
        const thickness = size * 0.25;
        const length = size * 0.4;
        this.ctx.fillRect(-thickness/2, -length, thickness, length * 2);
        this.ctx.fillRect(-length, -thickness/2, length * 2, thickness);
        break;
      case 'vertical':
        this.ctx.fillRect(-size * 0.15, -size * 0.4, size * 0.3, size * 0.8);
        break;
      case 'horizontal':
        this.ctx.fillRect(-size * 0.4, -size * 0.15, size * 0.8, size * 0.3);
        break;
      default: // square
        this.ctx.fillRect(-size/2, -size/2, size, size);
    }

    this.ctx.restore();
  }

  private drawFinderPattern(startModuleX: number, startModuleY: number, cellSize: number, settings: QRCodeSettings) {
    const finderSize = 7 * cellSize;
    const x = startModuleX * cellSize;
    const y = startModuleY * cellSize;
    const borderShape = settings.marker_border_shape || 'square';
    const centerShape = settings.marker_center_shape || 'square';
    const borderColor = settings.marker_border_color || settings.foreground_color;
    const centerColor = settings.marker_center_color || settings.foreground_color;

    // Draw outer border (7x7 with 1-cell thick border)
    this.ctx.fillStyle = borderColor;
    this.drawFinderBorder(x, y, finderSize, cellSize, borderShape);

    // Draw white middle ring (5x5 area)
    this.ctx.fillStyle = settings.background_color;
    const innerOffset = cellSize;
    const innerSize = 5 * cellSize;
    this.drawFinderInner(x + innerOffset, y + innerOffset, innerSize, cellSize, borderShape);

    // Draw center (3x3)
    this.ctx.fillStyle = centerColor;
    const centerOffset = 2 * cellSize;
    const centerSize = 3 * cellSize;
    this.drawFinderCenter(x + centerOffset, y + centerOffset, centerSize, centerShape);
  }

  private drawFinderBorder(x: number, y: number, size: number, cellSize: number, shape: string) {
    const radius = cellSize * 1.5;
    
    switch (shape) {
      case 'circle':
        this.ctx.beginPath();
        this.ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'rounded':
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, radius);
        this.ctx.fill();
        break;
      default: // square
        this.ctx.fillRect(x, y, size, size);
    }
  }

  private drawFinderInner(x: number, y: number, size: number, cellSize: number, shape: string) {
    const radius = cellSize;
    
    switch (shape) {
      case 'circle':
        this.ctx.beginPath();
        this.ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'rounded':
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, radius);
        this.ctx.fill();
        break;
      default: // square
        this.ctx.fillRect(x, y, size, size);
    }
  }

  private drawFinderCenter(x: number, y: number, size: number, shape: string) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    
    switch (shape) {
      case 'circle':
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      default: // square
        this.ctx.fillRect(x, y, size, size);
    }
  }

  private applyBorder(settings: QRCodeSettings) {
    if (settings.border_style === 'none' || !settings.border_width) return;

    this.ctx.strokeStyle = settings.border_color;
    this.ctx.lineWidth = settings.border_width;

    switch (settings.border_style) {
      case 'solid':
        this.ctx.setLineDash([]);
        break;
      case 'dashed':
        this.ctx.setLineDash([10, 5]);
        break;
      case 'dotted':
        this.ctx.setLineDash([2, 2]);
        break;
    }

    this.ctx.strokeRect(
      settings.border_width / 2,
      settings.border_width / 2,
      this.canvas.width - settings.border_width,
      this.canvas.height - settings.border_width
    );

    this.ctx.setLineDash([]);
  }

  private async applyCenterImage(settings: QRCodeSettings) {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const size = (this.canvas.width * settings.center_image_size) / 100;
        const x = (this.canvas.width - size) / 2;
        const y = (this.canvas.height - size) / 2;
        
        // Create a white background for the logo with padding
        const padding = size * 0.1;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.roundRect(x - padding, y - padding, size + padding * 2, size + padding * 2, padding);
        this.ctx.fill();
        
        // Enable high-quality image smoothing for the logo
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        this.ctx.drawImage(img, x, y, size, size);
        
        // Restore to disabled for any subsequent QR rendering
        this.ctx.imageSmoothingEnabled = false;
        
        resolve();
      };
      img.onerror = () => resolve();
      img.src = settings.center_image_url!;
    });
  }

  private applyShadow(settings: QRCodeSettings) {
    this.ctx.shadowColor = settings.shadow_color;
    this.ctx.shadowBlur = settings.shadow_blur;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
  }

  private applyScanText(settings: QRCodeSettings) {
    const fontSize = Math.max(12, this.canvas.width / 25);
    this.ctx.font = `bold ${fontSize}px Arial`;
    this.ctx.fillStyle = settings.foreground_color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Add background for text
    const textMetrics = this.ctx.measureText(settings.scan_text);
    const textWidth = textMetrics.width + 20;
    const textHeight = fontSize + 10;
    const x = (this.canvas.width - textWidth) / 2;
    const y = this.canvas.height - textHeight - 20;
    
    this.ctx.fillStyle = settings.background_color;
    this.ctx.fillRect(x, y, textWidth, textHeight);
    
    this.ctx.fillStyle = settings.foreground_color;
    this.ctx.fillText(settings.scan_text, this.canvas.width / 2, y + textHeight / 2);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  async exportAs(format: string, quality: number = 0.9): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to export canvas'));
        },
        `image/${format}`,
        quality
      );
    });
  }
}
