export interface FinderDefinition {
  id: string;
  label: string;
  thumb: (svg: SVGElement) => void;
  drawFinderBorder?: (g: SVGGElement, cx: number, cy: number, radius: number) => void;
  drawFinderCenter?: (g: SVGGElement, cx: number, cy: number, radius: number) => void;
}

export const FINDER_BORDER_DEFS: FinderDefinition[] = [
  {
    id: 'finder-border-01',
    label: 'Square',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (cx - radius).toString());
      rect.setAttribute('y', (cy - radius).toString());
      rect.setAttribute('width', (radius * 2).toString());
      rect.setAttribute('height', (radius * 2).toString());
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', 'currentColor');
      rect.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(rect);
    }
  },
  {
    id: 'finder-border-02',
    label: 'Rounded',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="20" y="20" width="60" height="60" rx="12" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (cx - radius).toString());
      rect.setAttribute('y', (cy - radius).toString());
      rect.setAttribute('width', (radius * 2).toString());
      rect.setAttribute('height', (radius * 2).toString());
      rect.setAttribute('rx', (radius * 0.2).toString());
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', 'currentColor');
      rect.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(rect);
    }
  },
  {
    id: 'finder-border-03',
    label: 'Circle',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx.toString());
      circle.setAttribute('cy', cy.toString());
      circle.setAttribute('r', radius.toString());
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', 'currentColor');
      circle.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(circle);
    }
  },
  {
    id: 'finder-border-04',
    label: 'Diamond',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M50 20 L80 50 L50 80 L20 50 Z" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M${cx} ${cy - radius} L${cx + radius} ${cy} L${cx} ${cy + radius} L${cx - radius} ${cy} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(path);
    }
  },
  {
    id: 'finder-border-05',
    label: 'Squircle',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M20 40 Q20 20 40 20 L60 20 Q80 20 80 40 L80 60 Q80 80 60 80 L40 80 Q20 80 20 60 Z" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const r = radius * 0.6;
      const d = `M${cx - radius} ${cy - r} Q${cx - radius} ${cy - radius} ${cx - r} ${cy - radius} L${cx + r} ${cy - radius} Q${cx + radius} ${cy - radius} ${cx + radius} ${cy - r} L${cx + radius} ${cy + r} Q${cx + radius} ${cy + radius} ${cx + r} ${cy + radius} L${cx - r} ${cy + radius} Q${cx - radius} ${cy + radius} ${cx - radius} ${cy + r} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(path);
    }
  },
  {
    id: 'finder-border-06',
    label: 'Hexagon',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M35 20 L65 20 L80 50 L65 80 L35 80 L20 50 Z" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        points.push(`${i === 0 ? 'M' : 'L'}${px} ${py}`);
      }
      points.push('Z');
      path.setAttribute('d', points.join(' '));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(path);
    }
  },
  {
    id: 'finder-border-07',
    label: 'Octagon',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M35 20 L65 20 L80 35 L80 65 L65 80 L35 80 L20 65 L20 35 Z" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const points = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        points.push(`${i === 0 ? 'M' : 'L'}${px} ${py}`);
      }
      points.push('Z');
      path.setAttribute('d', points.join(' '));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(path);
    }
  },
  {
    id: 'finder-border-08',
    label: 'Shield',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M50 20 Q65 20 80 35 L80 60 Q80 70 50 80 Q20 70 20 60 L20 35 Q35 20 50 20 Z" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M${cx} ${cy - radius} Q${cx + radius * 0.7} ${cy - radius} ${cx + radius} ${cy - radius * 0.5} L${cx + radius} ${cy + radius * 0.3} Q${cx + radius} ${cy + radius * 0.7} ${cx} ${cy + radius} Q${cx - radius} ${cy + radius * 0.7} ${cx - radius} ${cy + radius * 0.3} L${cx - radius} ${cy - radius * 0.5} Q${cx - radius * 0.7} ${cy - radius} ${cx} ${cy - radius} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(path);
    }
  },
  {
    id: 'finder-border-09',
    label: 'Leaf',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M50 20 Q70 30 80 50 Q70 70 50 80 Q30 70 20 50 Q30 30 50 20 Z" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M${cx} ${cy - radius} Q${cx + radius * 0.8} ${cy - radius * 0.5} ${cx + radius} ${cy} Q${cx + radius * 0.8} ${cy + radius * 0.5} ${cx} ${cy + radius} Q${cx - radius * 0.8} ${cy + radius * 0.5} ${cx - radius} ${cy} Q${cx - radius * 0.8} ${cy - radius * 0.5} ${cx} ${cy - radius} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(path);
    }
  },
  {
    id: 'finder-border-10',
    label: 'Ticket Cut',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M20 20 L80 20 L80 45 Q75 45 75 50 Q75 55 80 55 L80 80 L20 80 L20 55 Q25 55 25 50 Q25 45 20 45 Z" fill="none" stroke="currentColor" stroke-width="6"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cutSize = radius * 0.2;
      const d = `M${cx - radius} ${cy - radius} L${cx + radius} ${cy - radius} L${cx + radius} ${cy - cutSize} Q${cx + radius - cutSize} ${cy - cutSize} ${cx + radius - cutSize} ${cy} Q${cx + radius - cutSize} ${cy + cutSize} ${cx + radius} ${cy + cutSize} L${cx + radius} ${cy + radius} L${cx - radius} ${cy + radius} L${cx - radius} ${cy + cutSize} Q${cx - radius + cutSize} ${cy + cutSize} ${cx - radius + cutSize} ${cy} Q${cx - radius + cutSize} ${cy - cutSize} ${cx - radius} ${cy - cutSize} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (radius * 0.25).toString());
      g.appendChild(path);
    }
  },
  {
    id: 'finder-border-11',
    label: 'Double Ring',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" stroke-width="4"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      // Outer ring
      const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outerCircle.setAttribute('cx', cx.toString());
      outerCircle.setAttribute('cy', cy.toString());
      outerCircle.setAttribute('r', radius.toString());
      outerCircle.setAttribute('fill', 'none');
      outerCircle.setAttribute('stroke', 'currentColor');
      outerCircle.setAttribute('stroke-width', (radius * 0.15).toString());
      g.appendChild(outerCircle);

      // Inner ring
      const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      innerCircle.setAttribute('cx', cx.toString());
      innerCircle.setAttribute('cy', cy.toString());
      innerCircle.setAttribute('r', (radius * 0.65).toString());
      innerCircle.setAttribute('fill', 'none');
      innerCircle.setAttribute('stroke', 'currentColor');
      innerCircle.setAttribute('stroke-width', (radius * 0.15).toString());
      g.appendChild(innerCircle);
    }
  },
  {
    id: 'finder-border-12',
    label: 'Thin Ring',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="4"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx.toString());
      circle.setAttribute('cy', cy.toString());
      circle.setAttribute('r', radius.toString());
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', 'currentColor');
      circle.setAttribute('stroke-width', (radius * 0.15).toString());
      g.appendChild(circle);
    }
  },
  {
    id: 'finder-border-13',
    label: 'Thick Ring',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="12"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx.toString());
      circle.setAttribute('cy', cy.toString());
      circle.setAttribute('r', radius.toString());
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', 'currentColor');
      circle.setAttribute('stroke-width', (radius * 0.4).toString());
      g.appendChild(circle);
    }
  },
  {
    id: 'finder-border-14',
    label: 'Dashed Ring',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="8" stroke-dasharray="10,5"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx.toString());
      circle.setAttribute('cy', cy.toString());
      circle.setAttribute('r', radius.toString());
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', 'currentColor');
      circle.setAttribute('stroke-width', (radius * 0.3).toString());
      circle.setAttribute('stroke-dasharray', `${radius * 0.4},${radius * 0.2}`);
      g.appendChild(circle);
    }
  },
  {
    id: 'finder-border-15',
    label: 'Notched',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M25 20 L75 20 L80 25 L80 75 L75 80 L25 80 L20 75 L20 25 Z" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const notch = radius * 0.2;
      const d = `M${cx - radius + notch} ${cy - radius} L${cx + radius - notch} ${cy - radius} L${cx + radius} ${cy - radius + notch} L${cx + radius} ${cy + radius - notch} L${cx + radius - notch} ${cy + radius} L${cx - radius + notch} ${cy + radius} L${cx - radius} ${cy + radius - notch} L${cx - radius} ${cy - radius + notch} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(path);
    }
  },
  {
    id: 'finder-border-16',
    label: 'Beveled',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M30 20 L70 20 L80 30 L80 70 L70 80 L30 80 L20 70 L20 30 Z" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const bevel = radius * 0.3;
      const d = `M${cx - radius + bevel} ${cy - radius} L${cx + radius - bevel} ${cy - radius} L${cx + radius} ${cy - radius + bevel} L${cx + radius} ${cy + radius - bevel} L${cx + radius - bevel} ${cy + radius} L${cx - radius + bevel} ${cy + radius} L${cx - radius} ${cy + radius - bevel} L${cx - radius} ${cy - radius + bevel} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(path);
    }
  },
  {
    id: 'finder-border-17',
    label: 'Pill Square',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="20" y="35" width="60" height="30" rx="15" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const height = radius * 1.2;
      const width = radius * 2;
      rect.setAttribute('x', (cx - width / 2).toString());
      rect.setAttribute('y', (cy - height / 2).toString());
      rect.setAttribute('width', width.toString());
      rect.setAttribute('height', height.toString());
      rect.setAttribute('rx', (height / 2).toString());
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', 'currentColor');
      rect.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(rect);
    }
  },
  {
    id: 'finder-border-18',
    label: 'Soft Square',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="20" y="20" width="60" height="60" rx="20" fill="none" stroke="currentColor" stroke-width="8"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (cx - radius).toString());
      rect.setAttribute('y', (cy - radius).toString());
      rect.setAttribute('width', (radius * 2).toString());
      rect.setAttribute('height', (radius * 2).toString());
      rect.setAttribute('rx', (radius * 0.4).toString());
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', 'currentColor');
      rect.setAttribute('stroke-width', (radius * 0.3).toString());
      g.appendChild(rect);
    }
  },
  {
    id: 'finder-border-19',
    label: 'Corner Tabs',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M20 20 L30 20 L30 30 M70 20 L80 20 L80 30 M80 70 L80 80 L70 80 M30 80 L20 80 L20 70" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const tab = radius * 0.4;
      const d = `M${cx - radius} ${cy - radius} L${cx - radius + tab} ${cy - radius} L${cx - radius + tab} ${cy - radius + tab} M${cx + radius - tab} ${cy - radius} L${cx + radius} ${cy - radius} L${cx + radius} ${cy - radius + tab} M${cx + radius} ${cy + radius - tab} L${cx + radius} ${cy + radius} L${cx + radius - tab} ${cy + radius} M${cx - radius + tab} ${cy + radius} L${cx - radius} ${cy + radius} L${cx - radius} ${cy + radius - tab}`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', (radius * 0.3).toString());
      path.setAttribute('stroke-linecap', 'round');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-border-20',
    label: 'Square Inner Round',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" stroke-width="8"/><circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" stroke-width="4"/>`;
    },
    drawFinderBorder: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      // Outer square
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (cx - radius).toString());
      rect.setAttribute('y', (cy - radius).toString());
      rect.setAttribute('width', (radius * 2).toString());
      rect.setAttribute('height', (radius * 2).toString());
      rect.setAttribute('fill', 'none');
      rect.setAttribute('stroke', 'currentColor');
      rect.setAttribute('stroke-width', (radius * 0.25).toString());
      g.appendChild(rect);

      // Inner circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx.toString());
      circle.setAttribute('cy', cy.toString());
      circle.setAttribute('r', (radius * 0.6).toString());
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', 'currentColor');
      circle.setAttribute('stroke-width', (radius * 0.15).toString());
      g.appendChild(circle);
    }
  }
];

export const FINDER_CENTER_DEFS: FinderDefinition[] = [
  {
    id: 'finder-center-01',
    label: 'Square',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="35" y="35" width="30" height="30" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const size = radius * 0.6;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (cx - size / 2).toString());
      rect.setAttribute('y', (cy - size / 2).toString());
      rect.setAttribute('width', size.toString());
      rect.setAttribute('height', size.toString());
      rect.setAttribute('fill', 'currentColor');
      g.appendChild(rect);
    }
  },
  {
    id: 'finder-center-02',
    label: 'Rounded',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="35" y="35" width="30" height="30" rx="6" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const size = radius * 0.6;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (cx - size / 2).toString());
      rect.setAttribute('y', (cy - size / 2).toString());
      rect.setAttribute('width', size.toString());
      rect.setAttribute('height', size.toString());
      rect.setAttribute('rx', (size * 0.2).toString());
      rect.setAttribute('fill', 'currentColor');
      g.appendChild(rect);
    }
  },
  {
    id: 'finder-center-03',
    label: 'Circle',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<circle cx="50" cy="50" r="15" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx.toString());
      circle.setAttribute('cy', cy.toString());
      circle.setAttribute('r', (radius * 0.5).toString());
      circle.setAttribute('fill', 'currentColor');
      g.appendChild(circle);
    }
  },
  {
    id: 'finder-center-04',
    label: 'Diamond',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M50 35 L65 50 L50 65 L35 50 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const size = radius * 0.5;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M${cx} ${cy - size} L${cx + size} ${cy} L${cx} ${cy + size} L${cx - size} ${cy} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-05',
    label: 'Dot',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<circle cx="50" cy="50" r="8" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx.toString());
      circle.setAttribute('cy', cy.toString());
      circle.setAttribute('r', (radius * 0.25).toString());
      circle.setAttribute('fill', 'currentColor');
      g.appendChild(circle);
    }
  },
  {
    id: 'finder-center-06',
    label: 'Oval',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<ellipse cx="50" cy="50" rx="20" ry="12" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      ellipse.setAttribute('cx', cx.toString());
      ellipse.setAttribute('cy', cy.toString());
      ellipse.setAttribute('rx', (radius * 0.6).toString());
      ellipse.setAttribute('ry', (radius * 0.35).toString());
      ellipse.setAttribute('fill', 'currentColor');
      g.appendChild(ellipse);
    }
  },
  {
    id: 'finder-center-07',
    label: 'Pill H',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="30" y="42" width="40" height="16" rx="8" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const width = radius * 1.0;
      const height = radius * 0.4;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (cx - width / 2).toString());
      rect.setAttribute('y', (cy - height / 2).toString());
      rect.setAttribute('width', width.toString());
      rect.setAttribute('height', height.toString());
      rect.setAttribute('rx', (height / 2).toString());
      rect.setAttribute('fill', 'currentColor');
      g.appendChild(rect);
    }
  },
  {
    id: 'finder-center-08',
    label: 'Pill V',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<rect x="42" y="30" width="16" height="40" rx="8" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const width = radius * 0.4;
      const height = radius * 1.0;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (cx - width / 2).toString());
      rect.setAttribute('y', (cy - height / 2).toString());
      rect.setAttribute('width', width.toString());
      rect.setAttribute('height', height.toString());
      rect.setAttribute('rx', (width / 2).toString());
      rect.setAttribute('fill', 'currentColor');
      g.appendChild(rect);
    }
  },
  {
    id: 'finder-center-09',
    label: 'Star 4',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M50 35 L55 45 L50 55 L55 65 L50 75 L45 65 L50 55 L45 45 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const outer = radius * 0.5;
      const inner = radius * 0.25;
      const d = `M${cx} ${cy - outer} L${cx + inner} ${cy - inner} L${cx + outer} ${cy} L${cx + inner} ${cy + inner} L${cx} ${cy + outer} L${cx - inner} ${cy + inner} L${cx - outer} ${cy} L${cx - inner} ${cy - inner} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-10',
    label: 'Star 6',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M50 35 L53 42 L57 35 L60 42 L57 49 L60 56 L57 63 L53 56 L50 63 L47 56 L43 63 L40 56 L43 49 L40 42 L43 35 L47 42 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const outer = radius * 0.5;
      const inner = radius * 0.25;
      const points = [];
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const r = i % 2 === 0 ? outer : inner;
        const px = cx + Math.cos(angle - Math.PI / 2) * r;
        const py = cy + Math.sin(angle - Math.PI / 2) * r;
        points.push(`${i === 0 ? 'M' : 'L'}${px} ${py}`);
      }
      points.push('Z');
      path.setAttribute('d', points.join(' '));
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-11',
    label: 'Plus',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M45 35 L55 35 L55 45 L65 45 L65 55 L55 55 L55 65 L45 65 L45 55 L35 55 L35 45 L45 45 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const thick = radius * 0.3;
      const len = radius * 0.6;
      const d = `M${cx - thick/2} ${cy - len} L${cx + thick/2} ${cy - len} L${cx + thick/2} ${cy - thick/2} L${cx + len} ${cy - thick/2} L${cx + len} ${cy + thick/2} L${cx + thick/2} ${cy + thick/2} L${cx + thick/2} ${cy + len} L${cx - thick/2} ${cy + len} L${cx - thick/2} ${cy + thick/2} L${cx - len} ${cy + thick/2} L${cx - len} ${cy - thick/2} L${cx - thick/2} ${cy - thick/2} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-12',
    label: 'Cross',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M42 35 L58 35 L58 42 L65 42 L65 58 L58 58 L58 65 L42 65 L42 58 L35 58 L35 42 L42 42 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const thick = radius * 0.4;
      const len = radius * 0.6;
      const d = `M${cx - thick/2} ${cy - len} L${cx + thick/2} ${cy - len} L${cx + thick/2} ${cy - thick/2} L${cx + len} ${cy - thick/2} L${cx + len} ${cy + thick/2} L${cx + thick/2} ${cy + thick/2} L${cx + thick/2} ${cy + len} L${cx - thick/2} ${cy + len} L${cx - thick/2} ${cy + thick/2} L${cx - len} ${cy + thick/2} L${cx - len} ${cy - thick/2} L${cx - thick/2} ${cy - thick/2} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-13',
    label: 'Heart',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M50 65 Q35 50 35 42 Q35 35 42 35 Q50 35 50 42 Q50 35 58 35 Q65 35 65 42 Q65 50 50 65 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const size = radius * 0.6;
      const d = `M${cx} ${cy + size*0.5} Q${cx - size*0.8} ${cy - size*0.2} ${cx - size*0.8} ${cy - size*0.6} Q${cx - size*0.8} ${cy - size} ${cx - size*0.4} ${cy - size} Q${cx} ${cy - size} ${cx} ${cy - size*0.6} Q${cx} ${cy - size} ${cx + size*0.4} ${cy - size} Q${cx + size*0.8} ${cy - size} ${cx + size*0.8} ${cy - size*0.6} Q${cx + size*0.8} ${cy - size*0.2} ${cx} ${cy + size*0.5} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-14',
    label: 'Triangle Up',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M50 35 L65 65 L35 65 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const size = radius * 0.6;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M${cx} ${cy - size/2} L${cx + size/2} ${cy + size/2} L${cx - size/2} ${cy + size/2} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-15',
    label: 'Triangle Down',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M35 35 L65 35 L50 65 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const size = radius * 0.6;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M${cx - size/2} ${cy - size/2} L${cx + size/2} ${cy - size/2} L${cx} ${cy + size/2} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-16',
    label: 'Lozenge',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<ellipse cx="50" cy="50" rx="25" ry="12" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      ellipse.setAttribute('cx', cx.toString());
      ellipse.setAttribute('cy', cy.toString());
      ellipse.setAttribute('rx', (radius * 0.7).toString());
      ellipse.setAttribute('ry', (radius * 0.35).toString());
      ellipse.setAttribute('fill', 'currentColor');
      g.appendChild(ellipse);
    }
  },
  {
    id: 'finder-center-17',
    label: 'Hexagon',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M40 35 L60 35 L70 50 L60 65 L40 65 L30 50 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const r = radius * 0.5;
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
    id: 'finder-center-18',
    label: 'Octagon',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M40 35 L60 35 L70 40 L70 60 L60 65 L40 65 L30 60 L30 40 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const r = radius * 0.5;
      const points = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
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
    id: 'finder-center-19',
    label: 'Teardrop',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M50 35 Q65 45 65 55 Q65 65 50 65 Q35 65 35 55 Q35 45 50 35 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const size = radius * 0.6;
      const d = `M${cx} ${cy - size/2} Q${cx + size/2} ${cy - size/4} ${cx + size/2} ${cy + size/4} Q${cx + size/2} ${cy + size/2} ${cx} ${cy + size/2} Q${cx - size/2} ${cy + size/2} ${cx - size/2} ${cy + size/4} Q${cx - size/2} ${cy - size/4} ${cx} ${cy - size/2} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-20',
    label: 'Leaf',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M50 35 Q60 40 65 50 Q60 60 50 65 Q40 60 35 50 Q40 40 50 35 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const size = radius * 0.6;
      const d = `M${cx} ${cy - size/2} Q${cx + size/3} ${cy - size/4} ${cx + size/2} ${cy} Q${cx + size/3} ${cy + size/4} ${cx} ${cy + size/2} Q${cx - size/3} ${cy + size/4} ${cx - size/2} ${cy} Q${cx - size/3} ${cy - size/4} ${cx} ${cy - size/2} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-21',
    label: 'Notched',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M40 35 L60 35 L65 40 L65 60 L60 65 L40 65 L35 60 L35 40 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const size = radius * 0.6;
      const notch = size * 0.2;
      const d = `M${cx - size/2 + notch} ${cy - size/2} L${cx + size/2 - notch} ${cy - size/2} L${cx + size/2} ${cy - size/2 + notch} L${cx + size/2} ${cy + size/2 - notch} L${cx + size/2 - notch} ${cy + size/2} L${cx - size/2 + notch} ${cy + size/2} L${cx - size/2} ${cy + size/2 - notch} L${cx - size/2} ${cy - size/2 + notch} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-22',
    label: 'Beveled',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M42 35 L58 35 L65 42 L65 58 L58 65 L42 65 L35 58 L35 42 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const size = radius * 0.6;
      const bevel = size * 0.3;
      const d = `M${cx - size/2 + bevel} ${cy - size/2} L${cx + size/2 - bevel} ${cy - size/2} L${cx + size/2} ${cy - size/2 + bevel} L${cx + size/2} ${cy + size/2 - bevel} L${cx + size/2 - bevel} ${cy + size/2} L${cx - size/2 + bevel} ${cy + size/2} L${cx - size/2} ${cy + size/2 - bevel} L${cx - size/2} ${cy - size/2 + bevel} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-23',
    label: 'Barcode V',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<g><rect x="40" y="35" width="3" height="30" fill="currentColor"/><rect x="45" y="35" width="2" height="30" fill="currentColor"/><rect x="49" y="35" width="4" height="30" fill="currentColor"/><rect x="55" y="35" width="2" height="30" fill="currentColor"/></g>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const height = radius * 0.8;
      const widths = [0.1, 0.06, 0.12, 0.06];
      const positions = [-0.25, -0.1, 0.05, 0.25];
      
      for (let i = 0; i < 4; i++) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const width = radius * widths[i];
        rect.setAttribute('x', (cx + radius * positions[i] - width/2).toString());
        rect.setAttribute('y', (cy - height/2).toString());
        rect.setAttribute('width', width.toString());
        rect.setAttribute('height', height.toString());
        rect.setAttribute('fill', 'currentColor');
        g.appendChild(rect);
      }
    }
  },
  {
    id: 'finder-center-24',
    label: 'Barcode H',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<g><rect x="35" y="40" width="30" height="3" fill="currentColor"/><rect x="35" y="45" width="30" height="2" fill="currentColor"/><rect x="35" y="49" width="30" height="4" fill="currentColor"/><rect x="35" y="55" width="30" height="2" fill="currentColor"/></g>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const width = radius * 0.8;
      const heights = [0.1, 0.06, 0.12, 0.06];
      const positions = [-0.25, -0.1, 0.05, 0.25];
      
      for (let i = 0; i < 4; i++) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const height = radius * heights[i];
        rect.setAttribute('x', (cx - width/2).toString());
        rect.setAttribute('y', (cy + radius * positions[i] - height/2).toString());
        rect.setAttribute('width', width.toString());
        rect.setAttribute('height', height.toString());
        rect.setAttribute('fill', 'currentColor');
        g.appendChild(rect);
      }
    }
  },
  {
    id: 'finder-center-25',
    label: 'Squircle',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<path d="M35 45 Q35 35 45 35 L55 35 Q65 35 65 45 L65 55 Q65 65 55 65 L45 65 Q35 65 35 55 Z" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const size = radius * 0.6;
      const r = size * 0.3;
      const d = `M${cx - size/2} ${cy - r} Q${cx - size/2} ${cy - size/2} ${cx - r} ${cy - size/2} L${cx + r} ${cy - size/2} Q${cx + size/2} ${cy - size/2} ${cx + size/2} ${cy - r} L${cx + size/2} ${cy + r} Q${cx + size/2} ${cy + size/2} ${cx + r} ${cy + size/2} L${cx - r} ${cy + size/2} Q${cx - size/2} ${cy + size/2} ${cx - size/2} ${cy + r} Z`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'currentColor');
      g.appendChild(path);
    }
  },
  {
    id: 'finder-center-26',
    label: 'Small Dot',
    thumb: (svg: SVGElement) => {
      svg.innerHTML = `<circle cx="50" cy="50" r="5" fill="currentColor"/>`;
    },
    drawFinderCenter: (g: SVGGElement, cx: number, cy: number, radius: number) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', cx.toString());
      circle.setAttribute('cy', cy.toString());
      circle.setAttribute('r', (radius * 0.15).toString());
      circle.setAttribute('fill', 'currentColor');
      g.appendChild(circle);
    }
  }
];