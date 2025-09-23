export interface PatternDefinition {
  id: string;
  label: string;
  thumb: (svg: SVGElement) => void;
  drawModule: (g: SVGGElement, x: number, y: number, size: number) => void;
}

export const PATTERN_DEFS: PatternDefinition[] = [
  {
    id: 'pattern-01',
    label: 'Classic Square',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="10" y="10" width="16" height="16" fill="currentColor"/><rect x="30" y="10" width="16" height="16" fill="currentColor"/><rect x="50" y="10" width="16" height="16" fill="currentColor"/><rect x="70" y="10" width="16" height="16" fill="currentColor"/><rect x="10" y="30" width="16" height="16" fill="currentColor"/><rect x="50" y="30" width="16" height="16" fill="currentColor"/><rect x="10" y="50" width="16" height="16" fill="currentColor"/><rect x="30" y="50" width="16" height="16" fill="currentColor"/><rect x="70" y="50" width="16" height="16" fill="currentColor"/><rect x="30" y="70" width="16" height="16" fill="currentColor"/><rect x="50" y="70" width="16" height="16" fill="currentColor"/><rect x="70" y="70" width="16" height="16" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', size.toString());
      rect.setAttribute('height', size.toString());
      rect.setAttribute('fill', 'currentColor');
      g.appendChild(rect);
    }
  },
  {
    id: 'pattern-02',
    label: 'Rounded Small',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="10" y="10" width="16" height="16" rx="3" fill="currentColor"/><rect x="30" y="10" width="16" height="16" rx="3" fill="currentColor"/><rect x="50" y="10" width="16" height="16" rx="3" fill="currentColor"/><rect x="70" y="10" width="16" height="16" rx="3" fill="currentColor"/><rect x="10" y="30" width="16" height="16" rx="3" fill="currentColor"/><rect x="50" y="30" width="16" height="16" rx="3" fill="currentColor"/><rect x="10" y="50" width="16" height="16" rx="3" fill="currentColor"/><rect x="30" y="50" width="16" height="16" rx="3" fill="currentColor"/><rect x="70" y="50" width="16" height="16" rx="3" fill="currentColor"/><rect x="30" y="70" width="16" height="16" rx="3" fill="currentColor"/><rect x="50" y="70" width="16" height="16" rx="3" fill="currentColor"/><rect x="70" y="70" width="16" height="16" rx="3" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', size.toString());
      rect.setAttribute('height', size.toString());
      rect.setAttribute('rx', (size * 0.2).toString());
      rect.setAttribute('fill', 'currentColor');
      g.appendChild(rect);
    }
  },
  {
    id: 'pattern-03',
    label: 'Rounded Large',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="10" y="10" width="16" height="16" rx="8" fill="currentColor"/><rect x="30" y="10" width="16" height="16" rx="8" fill="currentColor"/><rect x="50" y="10" width="16" height="16" rx="8" fill="currentColor"/><rect x="70" y="10" width="16" height="16" rx="8" fill="currentColor"/><rect x="10" y="30" width="16" height="16" rx="8" fill="currentColor"/><rect x="50" y="30" width="16" height="16" rx="8" fill="currentColor"/><rect x="10" y="50" width="16" height="16" rx="8" fill="currentColor"/><rect x="30" y="50" width="16" height="16" rx="8" fill="currentColor"/><rect x="70" y="50" width="16" height="16" rx="8" fill="currentColor"/><rect x="30" y="70" width="16" height="16" rx="8" fill="currentColor"/><rect x="50" y="70" width="16" height="16" rx="8" fill="currentColor"/><rect x="70" y="70" width="16" height="16" rx="8" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', size.toString());
      rect.setAttribute('height', size.toString());
      rect.setAttribute('rx', (size * 0.5).toString());
      rect.setAttribute('fill', 'currentColor');
      g.appendChild(rect);
    }
  },
  {
    id: 'pattern-04',
    label: 'Dots',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<circle cx="18" cy="18" r="8" fill="currentColor"/><circle cx="38" cy="18" r="8" fill="currentColor"/><circle cx="58" cy="18" r="8" fill="currentColor"/><circle cx="78" cy="18" r="8" fill="currentColor"/><circle cx="18" cy="38" r="8" fill="currentColor"/><circle cx="58" cy="38" r="8" fill="currentColor"/><circle cx="18" cy="58" r="8" fill="currentColor"/><circle cx="38" cy="58" r="8" fill="currentColor"/><circle cx="78" cy="58" r="8" fill="currentColor"/><circle cx="38" cy="78" r="8" fill="currentColor"/><circle cx="58" cy="78" r="8" fill="currentColor"/><circle cx="78" cy="78" r="8" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', (x + size / 2).toString());
      circle.setAttribute('cy', (y + size / 2).toString());
      circle.setAttribute('r', (size / 2).toString());
      circle.setAttribute('fill', 'currentColor');
      g.appendChild(circle);
    }
  },
  {
    id: 'pattern-05',
    label: 'Diamond',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M18 10 L26 18 L18 26 L10 18 Z" fill="currentColor"/><path d="M38 10 L46 18 L38 26 L30 18 Z" fill="currentColor"/><path d="M58 10 L66 18 L58 26 L50 18 Z" fill="currentColor"/><path d="M78 10 L86 18 L78 26 L70 18 Z" fill="currentColor"/><path d="M18 30 L26 38 L18 46 L10 38 Z" fill="currentColor"/><path d="M58 30 L66 38 L58 46 L50 38 Z" fill="currentColor"/><path d="M18 50 L26 58 L18 66 L10 58 Z" fill="currentColor"/><path d="M38 50 L46 58 L38 66 L30 58 Z" fill="currentColor"/><path d="M78 50 L86 58 L78 66 L70 58 Z" fill="currentColor"/><path d="M38 70 L46 78 L38 86 L30 78 Z" fill="currentColor"/><path d="M58 70 L66 78 L58 86 L50 78 Z" fill="currentColor"/><path d="M78 70 L86 78 L78 86 L70 78 Z" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cx = x + size / 2;
      const cy = y + size / 2;
      const half = size / 2;
      const d = `M${cx} ${cy - half} L${cx + half} ${cy} L${cx} ${cy + half} L${cx - half} ${cy} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'pattern-06',
    label: 'Notched Corners',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M12 10 L24 10 L26 12 L26 24 L24 26 L12 26 L10 24 L10 12 Z" fill="currentColor"/><path d="M32 10 L44 10 L46 12 L46 24 L44 26 L32 26 L30 24 L30 12 Z" fill="currentColor"/><path d="M52 10 L64 10 L66 12 L66 24 L64 26 L52 26 L50 24 L50 12 Z" fill="currentColor"/><path d="M72 10 L84 10 L86 12 L86 24 L84 26 L72 26 L70 24 L70 12 Z" fill="currentColor"/><path d="M12 30 L24 30 L26 32 L26 44 L24 46 L12 46 L10 44 L10 32 Z" fill="currentColor"/><path d="M52 30 L64 30 L66 32 L66 44 L64 46 L52 46 L50 44 L50 32 Z" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const notch = size * 0.15;
      const d = `M${x + notch} ${y} L${x + size - notch} ${y} L${x + size} ${y + notch} L${x + size} ${y + size - notch} L${x + size - notch} ${y + size} L${x + notch} ${y + size} L${x} ${y + size - notch} L${x} ${y + notch} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'pattern-07',
    label: 'Squircle',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M10 18 Q10 10 18 10 L18 10 Q26 10 26 18 L26 18 Q26 26 18 26 L18 26 Q10 26 10 18 Z" fill="currentColor"/><path d="M30 18 Q30 10 38 10 L38 10 Q46 10 46 18 L46 18 Q46 26 38 26 L38 26 Q30 26 30 18 Z" fill="currentColor"/><path d="M50 18 Q50 10 58 10 L58 10 Q66 10 66 18 L66 18 Q66 26 58 26 L58 26 Q50 26 50 18 Z" fill="currentColor"/><path d="M70 18 Q70 10 78 10 L78 10 Q86 10 86 18 L86 18 Q86 26 78 26 L78 26 Q70 26 70 18 Z" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const r = size * 0.3;
      const d = `M${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + size - r} ${y} Q${x + size} ${y} ${x + size} ${y + r} L${x + size} ${y + size - r} Q${x + size} ${y + size} ${x + size - r} ${y + size} L${x + r} ${y + size} Q${x} ${y + size} ${x} ${y + size - r} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'pattern-08',
    label: 'Bars Vertical',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="10" y="10" width="6" height="16" rx="3" fill="currentColor"/><rect x="30" y="10" width="6" height="16" rx="3" fill="currentColor"/><rect x="50" y="10" width="6" height="16" rx="3" fill="currentColor"/><rect x="70" y="10" width="6" height="16" rx="3" fill="currentColor"/><rect x="10" y="30" width="6" height="16" rx="3" fill="currentColor"/><rect x="50" y="30" width="6" height="16" rx="3" fill="currentColor"/><rect x="10" y="50" width="6" height="16" rx="3" fill="currentColor"/><rect x="30" y="50" width="6" height="16" rx="3" fill="currentColor"/><rect x="70" y="50" width="6" height="16" rx="3" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (x + size * 0.25).toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', (size * 0.5).toString());
      rect.setAttribute('height', size.toString());
      rect.setAttribute('rx', (size * 0.25).toString());
      rect.setAttribute('fill', 'currentColor');
      g.appendChild(rect);
    }
  },
  {
    id: 'pattern-09',
    label: 'Bars Horizontal',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="10" y="14" width="16" height="6" rx="3" fill="currentColor"/><rect x="30" y="14" width="16" height="6" rx="3" fill="currentColor"/><rect x="50" y="14" width="16" height="6" rx="3" fill="currentColor"/><rect x="70" y="14" width="16" height="6" rx="3" fill="currentColor"/><rect x="10" y="34" width="16" height="6" rx="3" fill="currentColor"/><rect x="50" y="34" width="16" height="6" rx="3" fill="currentColor"/><rect x="10" y="54" width="16" height="6" rx="3" fill="currentColor"/><rect x="30" y="54" width="16" height="6" rx="3" fill="currentColor"/><rect x="70" y="54" width="16" height="6" rx="3" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', (y + size * 0.25).toString());
      rect.setAttribute('width', size.toString());
      rect.setAttribute('height', (size * 0.5).toString());
      rect.setAttribute('rx', (size * 0.25).toString());
      rect.setAttribute('fill', 'currentColor');
      g.appendChild(rect);
    }
  },
  {
    id: 'pattern-10',
    label: 'Cross',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M14 10 L22 10 L22 14 L26 14 L26 22 L22 22 L22 26 L14 26 L14 22 L10 22 L10 14 L14 14 Z" fill="currentColor"/><path d="M34 10 L42 10 L42 14 L46 14 L46 22 L42 22 L42 26 L34 26 L34 22 L30 22 L30 14 L34 14 Z" fill="currentColor"/><path d="M54 10 L62 10 L62 14 L66 14 L66 22 L62 22 L62 26 L54 26 L54 22 L50 22 L50 14 L54 14 Z" fill="currentColor"/><path d="M74 10 L82 10 L82 14 L86 14 L86 22 L82 22 L82 26 L74 26 L74 22 L70 22 L70 14 L74 14 Z" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const thick = size * 0.4;
      const cx = x + size / 2;
      const cy = y + size / 2;
      const d = `M${cx - thick/2} ${y} L${cx + thick/2} ${y} L${cx + thick/2} ${cy - thick/2} L${x + size} ${cy - thick/2} L${x + size} ${cy + thick/2} L${cx + thick/2} ${cy + thick/2} L${cx + thick/2} ${y + size} L${cx - thick/2} ${y + size} L${cx - thick/2} ${cy + thick/2} L${x} ${cy + thick/2} L${x} ${cy - thick/2} L${cx - thick/2} ${cy - thick/2} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'pattern-11',
    label: 'Plus Rounded',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M14 10 Q16 10 16 12 L16 14 L18 14 Q20 14 20 16 L20 20 Q20 22 18 22 L16 22 L16 24 Q16 26 14 26 L12 26 Q10 26 10 24 L10 22 L8 22 Q6 22 6 20 L6 16 Q6 14 8 14 L10 14 L10 12 Q10 10 12 10 Z" fill="currentColor"/><path d="M34 10 Q36 10 36 12 L36 14 L38 14 Q40 14 40 16 L40 20 Q40 22 38 22 L36 22 L36 24 Q36 26 34 26 L32 26 Q30 26 30 24 L30 22 L28 22 Q26 22 26 20 L26 16 Q26 14 28 14 L30 14 L30 12 Q30 10 32 10 Z" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const thick = size * 0.35;
      const r = size * 0.1;
      const cx = x + size / 2;
      const cy = y + size / 2;
      const d = `M${cx - thick/2} ${y + r} Q${cx - thick/2} ${y} ${cx - thick/2 + r} ${y} L${cx + thick/2 - r} ${y} Q${cx + thick/2} ${y} ${cx + thick/2} ${y + r} L${cx + thick/2} ${cy - thick/2} L${x + size - r} ${cy - thick/2} Q${x + size} ${cy - thick/2} ${x + size} ${cy - thick/2 + r} L${x + size} ${cy + thick/2 - r} Q${x + size} ${cy + thick/2} ${x + size - r} ${cy + thick/2} L${cx + thick/2} ${cy + thick/2} L${cx + thick/2} ${y + size - r} Q${cx + thick/2} ${y + size} ${cx + thick/2 - r} ${y + size} L${cx - thick/2 + r} ${y + size} Q${cx - thick/2} ${y + size} ${cx - thick/2} ${y + size - r} L${cx - thick/2} ${cy + thick/2} L${x + r} ${cy + thick/2} Q${x} ${cy + thick/2} ${x} ${cy + thick/2 - r} L${x} ${cy - thick/2 + r} Q${x} ${cy - thick/2} ${x + r} ${cy - thick/2} L${cx - thick/2} ${cy - thick/2} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'pattern-12',
    label: 'Star 4',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M18 10 L22 14 L18 18 L22 22 L18 26 L14 22 L18 18 L14 14 Z" fill="currentColor"/><path d="M38 10 L42 14 L38 18 L42 22 L38 26 L34 22 L38 18 L34 14 Z" fill="currentColor"/><path d="M58 10 L62 14 L58 18 L62 22 L58 26 L54 22 L58 18 L54 14 Z" fill="currentColor"/><path d="M78 10 L82 14 L78 18 L82 22 L78 26 L74 22 L78 18 L74 14 Z" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cx = x + size / 2;
      const cy = y + size / 2;
      const outer = size / 2;
      const inner = size / 4;
      const d = `M${cx} ${cy - outer} L${cx + inner} ${cy - inner} L${cx + outer} ${cy} L${cx + inner} ${cy + inner} L${cx} ${cy + outer} L${cx - inner} ${cy + inner} L${cx - outer} ${cy} L${cx - inner} ${cy - inner} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'pattern-13',
    label: 'Star 6',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M18 10 L21 13 L24 10 L27 13 L24 16 L27 19 L24 22 L21 19 L18 22 L15 19 L18 16 L15 13 Z" fill="currentColor"/><path d="M38 10 L41 13 L44 10 L47 13 L44 16 L47 19 L44 22 L41 19 L38 22 L35 19 L38 16 L35 13 Z" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cx = x + size / 2;
      const cy = y + size / 2;
      const outer = size / 2;
      const inner = size / 3;
      const points = [];
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const radius = i % 2 === 0 ? outer : inner;
        const px = cx + Math.cos(angle - Math.PI / 2) * radius;
        const py = cy + Math.sin(angle - Math.PI / 2) * radius;
        points.push(`${i === 0 ? 'M' : 'L'}${px} ${py}`);
      }
      points.push('Z');
      path.setAttribute('d', points.join(' '));
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'pattern-14',
    label: 'Triangle Up',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M18 10 L26 24 L10 24 Z" fill="currentColor"/><path d="M38 10 L46 24 L30 24 Z" fill="currentColor"/><path d="M58 10 L66 24 L50 24 Z" fill="currentColor"/><path d="M78 10 L86 24 L70 24 Z" fill="currentColor"/><path d="M18 30 L26 44 L10 44 Z" fill="currentColor"/><path d="M58 30 L66 44 L50 44 Z" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cx = x + size / 2;
      const d = `M${cx} ${y} L${x + size} ${y + size} L${x} ${y + size} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'pattern-15',
    label: 'Triangle Down',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M10 10 L26 10 L18 24 Z" fill="currentColor"/><path d="M30 10 L46 10 L38 24 Z" fill="currentColor"/><path d="M50 10 L66 10 L58 24 Z" fill="currentColor"/><path d="M70 10 L86 10 L78 24 Z" fill="currentColor"/><path d="M10 30 L26 30 L18 44 Z" fill="currentColor"/><path d="M50 30 L66 30 L58 44 Z" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cx = x + size / 2;
      const d = `M${x} ${y} L${x + size} ${y} L${cx} ${y + size} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'pattern-16',
    label: 'Hexagon',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M14 10 L22 10 L26 18 L22 26 L14 26 L10 18 Z" fill="currentColor"/><path d="M34 10 L42 10 L46 18 L42 26 L34 26 L30 18 Z" fill="currentColor"/><path d="M54 10 L62 10 L66 18 L62 26 L54 26 L50 18 Z" fill="currentColor"/><path d="M74 10 L82 10 L86 18 L82 26 L74 26 L70 18 Z" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size / 2;
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        points.push(`${i === 0 ? 'M' : 'L'}${px} ${py}`);
      }
      points.push('Z');
      path.setAttribute('d', points.join(' '));
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'pattern-17',
    label: 'Lozenge',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<ellipse cx="18" cy="18" rx="8" ry="4" fill="currentColor"/><ellipse cx="38" cy="18" rx="8" ry="4" fill="currentColor"/><ellipse cx="58" cy="18" rx="8" ry="4" fill="currentColor"/><ellipse cx="78" cy="18" rx="8" ry="4" fill="currentColor"/><ellipse cx="18" cy="38" rx="8" ry="4" fill="currentColor"/><ellipse cx="58" cy="38" rx="8" ry="4" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      ellipse.setAttribute('cx', (x + size / 2).toString());
      ellipse.setAttribute('cy', (y + size / 2).toString());
      ellipse.setAttribute('rx', (size / 2).toString());
      ellipse.setAttribute('ry', (size / 4).toString());
      ellipse.setAttribute('fill', 'currentColor');
      g.appendChild(ellipse);
    }
  },
  {
    id: 'pattern-18',
    label: 'Clover',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<g transform="translate(18,18)"><circle cx="-4" cy="-4" r="3" fill="currentColor"/><circle cx="4" cy="-4" r="3" fill="currentColor"/><circle cx="-4" cy="4" r="3" fill="currentColor"/><circle cx="4" cy="4" r="3" fill="currentColor"/></g><g transform="translate(38,18)"><circle cx="-4" cy="-4" r="3" fill="currentColor"/><circle cx="4" cy="-4" r="3" fill="currentColor"/><circle cx="-4" cy="4" r="3" fill="currentColor"/><circle cx="4" cy="4" r="3" fill="currentColor"/></g>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size / 6;
      const offset = size / 4;
      
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', (cx + dx * offset).toString());
        circle.setAttribute('cy', (cy + dy * offset).toString());
        circle.setAttribute('r', r.toString());
        circle.setAttribute('fill', 'currentColor');
        g.appendChild(circle);
      }
    }
  },
  {
    id: 'pattern-19',
    label: 'Weave',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M10 10 Q10 10 12 10 L24 10 Q26 10 26 12 L26 16 Q26 18 24 18 L20 18 L20 22 L24 22 Q26 22 26 24 L26 24 Q26 26 24 26 L12 26 Q10 26 10 24 L10 20 Q10 18 12 18 L16 18 L16 14 L12 14 Q10 14 10 12 Z" fill="currentColor"/><path d="M30 10 Q30 10 32 10 L44 10 Q46 10 46 12 L46 16 Q46 18 44 18 L40 18 L40 22 L44 22 Q46 22 46 24 L46 24 Q46 26 44 26 L32 26 Q30 26 30 24 L30 20 Q30 18 32 18 L36 18 L36 14 L32 14 Q30 14 30 12 Z" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const r = size * 0.15;
      const gap = size * 0.3;
      const d = `M${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + size - r} ${y} Q${x + size} ${y} ${x + size} ${y + r} L${x + size} ${y + gap} Q${x + size} ${y + gap + r} ${x + size - r} ${y + gap + r} L${x + size - gap} ${y + gap + r} L${x + size - gap} ${y + size - gap - r} L${x + size - r} ${y + size - gap - r} Q${x + size} ${y + size - gap - r} ${x + size} ${y + size - gap} L${x + size} ${y + size - r} Q${x + size} ${y + size} ${x + size - r} ${y + size} L${x + r} ${y + size} Q${x} ${y + size} ${x} ${y + size - r} L${x} ${y + size - gap} Q${x} ${y + size - gap - r} ${x + r} ${y + size - gap - r} L${x + gap} ${y + size - gap - r} L${x + gap} ${y + gap + r} L${x + r} ${y + gap + r} Q${x} ${y + gap + r} ${x} ${y + gap} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'pattern-20',
    label: 'Pixel Rounded',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="10" y="10" width="16" height="16" rx="2" fill="currentColor"/><rect x="30" y="10" width="16" height="16" rx="0" fill="currentColor"/><rect x="50" y="10" width="16" height="16" rx="2" fill="currentColor"/><rect x="70" y="10" width="16" height="16" rx="2" fill="currentColor"/><rect x="10" y="30" width="16" height="16" rx="0" fill="currentColor"/><rect x="50" y="30" width="16" height="16" rx="0" fill="currentColor"/>`;
    },
    drawModule: (g: SVGGElement, x: number, y: number, size: number) => {
      // This would need context about neighboring modules to implement properly
      // For now, just use small rounded corners
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', size.toString());
      rect.setAttribute('height', size.toString());
      rect.setAttribute('rx', (size * 0.1).toString());
      rect.setAttribute('fill', 'currentColor');
      g.appendChild(rect);
    }
  }
];