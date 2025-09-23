import QRCode from 'qrcode';
import { PATTERN_DEFS, PatternDefinition } from './qrPatternDefinitions';
import { FINDER_BORDER_DEFS, FINDER_CENTER_DEFS, FinderDefinition } from './qrFinderDefinitions';

interface SimpleQRSettings {
  background_color: string;
  foreground_color: string;
  pattern_style: string;
  design?: {
    useCustomMarkerColors?: boolean;
    useDifferentMarkerColors?: boolean;
    markerBorderColor?: string;
    markerCenterColor?: string;
    markers?: any;
  };
}

export class AdvancedQREngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size: number;
  private cachedSvg: string | null = null;
  private lastSettings: string | null = null;

  constructor(size: number = 1024) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.size = size;
    this.canvas.width = size;
    this.canvas.height = size;
  }

  async generateQR(url: string, settings: SimpleQRSettings): Promise<string> {
    // Check cache
    const settingsKey = JSON.stringify({ url, settings });
    if (this.cachedSvg && this.lastSettings === settingsKey) {
      return this.cachedSvg;
    }

    try {
      // Generate QR matrix with high error correction
      const qrMatrix = await this.getQRMatrix(url);
      
      // Create SVG
      const svg = await this.renderSVG(qrMatrix, settings);
      
      // Cache result
      this.cachedSvg = svg;
      this.lastSettings = settingsKey;
      
      return svg;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  private async getQRMatrix(url: string): Promise<boolean[][]> {
    const qrOptions = {
      errorCorrectionLevel: 'H' as const,
      type: 'svg' as const,
      margin: 4,
      width: 512
    };

    const qrSvg = await QRCode.toString(url, qrOptions);
    
    // Parse the SVG to extract the matrix
    const parser = new DOMParser();
    const doc = parser.parseFromString(qrSvg, 'image/svg+xml');
    const rects = doc.querySelectorAll('rect');
    
    // Find the size by looking at the viewBox or SVG dimensions
    const svgElement = doc.querySelector('svg');
    const viewBox = svgElement?.getAttribute('viewBox');
    let svgSize = 200; // Default fallback
    
    if (viewBox) {
      const parts = viewBox.split(' ');
      svgSize = parseInt(parts[2]) || 200;
    }
    
    // Calculate module size and grid dimensions
    const moduleSize = svgSize / (21 + 8); // 21x21 minimum + 4 margin on each side
    const gridSize = Math.round(svgSize / moduleSize);
    
    // Initialize matrix
    const matrix: boolean[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
    
    // Fill matrix from SVG rects
    rects.forEach(rect => {
      const x = parseInt(rect.getAttribute('x') || '0');
      const y = parseInt(rect.getAttribute('y') || '0');
      const width = parseInt(rect.getAttribute('width') || '0');
      const height = parseInt(rect.getAttribute('height') || '0');
      
      const moduleX = Math.floor(x / moduleSize);
      const moduleY = Math.floor(y / moduleSize);
      const moduleW = Math.ceil(width / moduleSize);
      const moduleH = Math.ceil(height / moduleSize);
      
      for (let my = moduleY; my < Math.min(moduleY + moduleH, gridSize); my++) {
        for (let mx = moduleX; mx < Math.min(moduleX + moduleW, gridSize); mx++) {
          if (my >= 0 && mx >= 0) {
            matrix[my][mx] = true;
          }
        }
      }
    });
    
    return matrix;
  }

  private async renderSVG(matrix: boolean[][], settings: SimpleQRSettings): Promise<string> {
    const matrixSize = matrix.length;
    const moduleSize = this.size / matrixSize;
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${this.size} ${this.size}`);
    svg.setAttribute('width', this.size.toString());
    svg.setAttribute('height', this.size.toString());
    
    // Apply background
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', settings.background_color || '#ffffff');
    svg.appendChild(bgRect);
    
    // Get pattern and finder definitions
    const patternDef = PATTERN_DEFS.find(p => p.id === settings.pattern_style) || PATTERN_DEFS[0];
    const finderBorderDef = FINDER_BORDER_DEFS.find(f => f.id === `finder-border-${settings.pattern_style.split('-')[1] || '01'}`) || FINDER_BORDER_DEFS[0];
    const finderCenterDef = FINDER_CENTER_DEFS.find(f => f.id === `finder-center-${settings.pattern_style.split('-')[1] || '01'}`) || FINDER_CENTER_DEFS[0];
    
    // Create groups for different parts
    const moduleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    moduleGroup.setAttribute('fill', settings.foreground_color || '#000000');
    svg.appendChild(moduleGroup);
    
    const finderGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(finderGroup);
    
    // Draw modules (excluding finder patterns)
    for (let y = 0; y < matrixSize; y++) {
      for (let x = 0; x < matrixSize; x++) {
        if (matrix[y] && matrix[y][x] && !this.isFinderPattern(x, y, matrixSize)) {
          const moduleX = x * moduleSize;
          const moduleY = y * moduleSize;
          patternDef.drawModule(moduleGroup, moduleX, moduleY, moduleSize);
        }
      }
    }
    
    // Draw finder patterns
    this.drawFinderPatterns(finderGroup, matrixSize, moduleSize, finderBorderDef, finderCenterDef, settings);
    
    // Return SVG as string
    return new XMLSerializer().serializeToString(svg);
  }

  private isFinderPattern(x: number, y: number, matrixSize: number): boolean {
    // Top-left finder
    if (x < 9 && y < 9) return true;
    // Top-right finder
    if (x >= matrixSize - 8 && y < 9) return true;
    // Bottom-left finder
    if (x < 9 && y >= matrixSize - 8) return true;
    return false;
  }

  private drawFinderPatterns(
    group: SVGGElement, 
    matrixSize: number, 
    moduleSize: number, 
    borderDef: FinderDefinition, 
    centerDef: FinderDefinition,
    settings: SimpleQRSettings
  ) {
    const finderPositions = [
      { x: 3.5, y: 3.5 }, // Top-left
      { x: matrixSize - 4.5, y: 3.5 }, // Top-right  
      { x: 3.5, y: matrixSize - 4.5 } // Bottom-left
    ];
    
    const finderRadius = moduleSize * 3.5;
    
    finderPositions.forEach((pos, index) => {
      const cx = pos.x * moduleSize;
      const cy = pos.y * moduleSize;
      
      // Create group for this finder
      const finderGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      // Determine colors based on custom marker settings
      const useCustomColors = (settings as any).design?.useCustomMarkerColors;
      const useDifferentColors = (settings as any).design?.useDifferentMarkerColors;
      
      let borderColor = settings.foreground_color || '#000000';
      let centerColor = settings.foreground_color || '#000000';
      
      if (useCustomColors) {
        const globalBorderColor = (settings as any).design?.markerBorderColor || settings.foreground_color;
        const globalCenterColor = (settings as any).design?.markerCenterColor || settings.foreground_color;
        
        if (useDifferentColors && index > 0) {
          // Use per-marker overrides for TR and BL
          const markerKey = index === 1 ? 'TR' : 'BL';
          const markers = (settings as any).design?.markers;
          
          borderColor = markers?.[markerKey]?.border || globalBorderColor;
          centerColor = markers?.[markerKey]?.center || globalCenterColor;
        } else {
          // Use global custom colors
          borderColor = globalBorderColor;
          centerColor = globalCenterColor;
        }
      }
      
      // Draw border
      if (borderDef.drawFinderBorder) {
        const borderGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        borderGroup.setAttribute('color', borderColor);
        borderDef.drawFinderBorder(borderGroup, cx, cy, finderRadius);
        finderGroup.appendChild(borderGroup);
      }
      
      // Draw center
      if (centerDef.drawFinderCenter) {
        const centerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        centerGroup.setAttribute('color', centerColor);
        centerDef.drawFinderCenter(centerGroup, cx, cy, finderRadius * 0.6);
        finderGroup.appendChild(centerGroup);
      }
      
      group.appendChild(finderGroup);
    });
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  async exportAs(format: string, quality: number = 0.9): Promise<Blob> {
    if (!this.cachedSvg) {
      throw new Error('No QR code generated yet');
    }

    if (format === 'svg') {
      return new Blob([this.cachedSvg], { type: 'image/svg+xml' });
    }

    // For raster formats, render SVG to canvas first
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Use high resolution for crisp output
    const resolution = Math.max(2048, this.size);
    canvas.width = resolution;
    canvas.height = resolution;
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.clearRect(0, 0, resolution, resolution);
        ctx.drawImage(img, 0, 0, resolution, resolution);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to export image'));
          }
        }, `image/${format}`, quality);
      };
      
      img.onerror = () => reject(new Error('Failed to load SVG'));
      img.src = 'data:image/svg+xml;base64,' + btoa(this.cachedSvg);
    });
  }

  clearCache() {
    this.cachedSvg = null;
    this.lastSettings = null;
  }
}