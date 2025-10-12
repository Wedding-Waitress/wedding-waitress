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
    
    // Apply QR pattern with shape and style
    this.applyQRPattern(qrMatrix, settings);

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
    if (process.env.NODE_ENV === 'development') {
      console.log('Generating QR matrix for URL:', url); // Debug logging
    }
    const qrDataURL = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H', // Increased error correction for better scanning
      margin: 0,
      width: this.canvas.width,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const matrix: boolean[][] = [];
        
        for (let y = 0; y < img.height; y++) {
          matrix[y] = [];
          for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            matrix[y][x] = imageData.data[i] < 128; // true for dark pixels
          }
        }
        resolve(matrix);
      };
      img.src = qrDataURL;
    });
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

  private applyQRPattern(matrix: boolean[][], settings: QRCodeSettings) {
    const cellSize = this.canvas.width / matrix.length;
    
    // Ensure no filters or opacity issues
    this.ctx.globalAlpha = 1;
    this.ctx.filter = 'none';
    this.ctx.fillStyle = settings.foreground_color;

    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          this.drawQRCell(x * cellSize, y * cellSize, cellSize, settings);
        }
      }
    }
  }

  private drawQRCell(x: number, y: number, size: number, settings: QRCodeSettings) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);

    switch (settings.shape) {
      case 'circle':
        this.drawCircle(size);
        break;
      case 'rounded':
        this.drawRoundedSquare(size);
        break;
      case 'diamond':
        this.drawDiamond(size);
        break;
      case 'hexagon':
        this.drawPolygon(6, size);
        break;
      case 'octagon':
        this.drawPolygon(8, size);
        break;
      case 'triangle':
        this.drawPolygon(3, size);
        break;
      case 'pentagon':
        this.drawPolygon(5, size);
        break;
      case 'heart':
        this.drawHeart(size);
        break;
      case 'star':
        this.drawStar(size);
        break;
      case 'flower':
        this.drawFlower(size);
        break;
      default:
        this.drawSquare(size);
    }

    this.ctx.restore();
  }

  private drawCircle(size: number) {
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawSquare(size: number) {
    this.ctx.fillRect(-size/2, -size/2, size, size);
  }

  private drawRoundedSquare(size: number) {
    const half = size * 0.4;
    const radius = size * 0.1;
    
    this.ctx.beginPath();
    this.ctx.roundRect(-half, -half, size * 0.8, size * 0.8, radius);
    this.ctx.fill();
  }

  private drawDiamond(size: number) {
    const half = size * 0.4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -half);
    this.ctx.lineTo(half, 0);
    this.ctx.lineTo(0, half);
    this.ctx.lineTo(-half, 0);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawPolygon(sides: number, size: number) {
    const radius = size * 0.4;
    this.ctx.beginPath();
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawHeart(size: number) {
    const scale = size * 0.02;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 3 * scale);
    this.ctx.bezierCurveTo(-15 * scale, -5 * scale, -25 * scale, 5 * scale, 0, 15 * scale);
    this.ctx.bezierCurveTo(25 * scale, 5 * scale, 15 * scale, -5 * scale, 0, 3 * scale);
    this.ctx.fill();
  }

  private drawStar(size: number) {
    const radius = size * 0.4;
    const innerRadius = radius * 0.4;
    this.ctx.beginPath();
    
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? radius : innerRadius;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawFlower(size: number) {
    const petalRadius = size * 0.2;
    const centerRadius = size * 0.15;
    
    // Draw petals
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerRadius * Math.cos(angle);
      const y = centerRadius * Math.sin(angle);
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, petalRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Draw center
    this.ctx.beginPath();
    this.ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
    this.ctx.fill();
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
        
        // Create a white background for the logo
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x - 10, y - 10, size + 20, size + 20);
        
        this.ctx.drawImage(img, x, y, size, size);
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