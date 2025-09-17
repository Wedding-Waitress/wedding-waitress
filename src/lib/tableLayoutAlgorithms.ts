import { TableWithGuestCount } from '@/hooks/useTables';

export interface TablePosition {
  id: string;
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  width: number; // Normalized 0-1
  height: number; // Normalized 0-1
  table: TableWithGuestCount;
}

/**
 * Generate table positions based on layout algorithm
 */
export const generateTableLayout = (
  tables: TableWithGuestCount[],
  layout: 'grid' | 'organic' | 'custom'
): TablePosition[] => {
  switch (layout) {
    case 'grid':
      return generatePrintReadyGridLayout(tables);
    case 'organic':
      return generateOrganicLayout(tables);
    case 'custom':
      return generateCustomLayout(tables);
    default:
      return generatePrintReadyGridLayout(tables);
  }
};

/**
 * Print-Ready Grid Layout - Fixed 3 columns, uniform table sizes, portrait format
 */
const generatePrintReadyGridLayout = (tables: TableWithGuestCount[]): TablePosition[] => {
  if (tables.length === 0) return [];

  // Fixed 3 columns for print-ready format
  const cols = 3;
  const rows = Math.ceil(tables.length / cols);

  // Uniform table size for all tables
  const tableWidth = 0.25; // Fixed width
  const tableHeight = 0.15; // Fixed height for portrait format

  // Calculate spacing
  const totalTableWidth = cols * tableWidth;
  const totalTableHeight = rows * tableHeight;
  const paddingX = (1 - totalTableWidth) / (cols + 1);
  const paddingY = (1 - totalTableHeight) / (rows + 1);

  return tables.map((table, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    const x = paddingX + col * (tableWidth + paddingX);
    const y = paddingY + row * (tableHeight + paddingY);

    return {
      id: table.id,
      x: Math.max(0, Math.min(1 - tableWidth, x)),
      y: Math.max(0, Math.min(1 - tableHeight, y)),
      width: tableWidth,
      height: tableHeight,
      table
    };
  });
};

/**
 * Grid Layout - Organized rows and columns (original, kept for backward compatibility)
 */
const generateGridLayout = (tables: TableWithGuestCount[]): TablePosition[] => {
  if (tables.length === 0) return [];

  // Calculate optimal grid dimensions
  const tableCount = tables.length;
  const cols = Math.ceil(Math.sqrt(tableCount));
  const rows = Math.ceil(tableCount / cols);

  // Base table size
  const baseWidth = 0.8 / cols;
  const baseHeight = 0.8 / rows;

  // Padding between tables
  const paddingX = 0.1 / (cols + 1);
  const paddingY = 0.1 / (rows + 1);

  return tables.map((table, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    // Adjust size based on capacity
    const capacityFactor = Math.min(1.2, Math.max(0.8, table.limit_seats / 8));
    const width = baseWidth * capacityFactor;
    const height = baseHeight * capacityFactor;

    const x = paddingX + col * (baseWidth + paddingX) + (baseWidth - width) / 2;
    const y = paddingY + row * (baseHeight + paddingY) + (baseHeight - height) / 2;

    return {
      id: table.id,
      x: Math.max(0, Math.min(1 - width, x)),
      y: Math.max(0, Math.min(1 - height, y)),
      width,
      height,
      table
    };
  });
};

/**
 * Organic Layout - Natural spacing based on venue flow
 */
const generateOrganicLayout = (tables: TableWithGuestCount[]): TablePosition[] => {
  if (tables.length === 0) return [];

  const positions: TablePosition[] = [];
  const minDistance = 0.15; // Minimum distance between table centers
  const maxAttempts = 100;

  // Sort tables by capacity (larger tables placed first)
  const sortedTables = [...tables].sort((a, b) => b.limit_seats - a.limit_seats);

  for (let i = 0; i < sortedTables.length; i++) {
    const table = sortedTables[i];
    let bestPosition: TablePosition | null = null;
    let bestScore = -1;

    // Adjust size based on capacity
    const capacityFactor = Math.min(1.2, Math.max(0.6, table.limit_seats / 10));
    const width = 0.12 * capacityFactor;
    const height = 0.12 * capacityFactor;

    // Try to find the best position
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.random() * (1 - width);
      const y = Math.random() * (1 - height);

      // Check distance from other tables
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      let isValidPosition = true;
      let totalDistance = 0;

      for (const pos of positions) {
        const otherCenterX = pos.x + pos.width / 2;
        const otherCenterY = pos.y + pos.height / 2;
        const distance = Math.sqrt(
          Math.pow(centerX - otherCenterX, 2) + Math.pow(centerY - otherCenterY, 2)
        );

        if (distance < minDistance) {
          isValidPosition = false;
          break;
        }

        totalDistance += distance;
      }

      if (isValidPosition) {
        // Score based on average distance (prefer moderate distances)
        const avgDistance = positions.length > 0 ? totalDistance / positions.length : 1;
        const score = 1 - Math.abs(avgDistance - 0.3); // Prefer ~0.3 average distance

        if (score > bestScore) {
          bestScore = score;
          bestPosition = {
            id: table.id,
            x,
            y,
            width,
            height,
            table
          };
        }
      }
    }

    // Fallback to grid position if no valid organic position found
    if (!bestPosition) {
      const fallbackIndex = positions.length;
      const cols = Math.ceil(Math.sqrt(sortedTables.length));
      const row = Math.floor(fallbackIndex / cols);
      const col = fallbackIndex % cols;

      bestPosition = {
        id: table.id,
        x: (col / cols) * (1 - width),
        y: (row / Math.ceil(sortedTables.length / cols)) * (1 - height),
        width,
        height,
        table
      };
    }

    positions.push(bestPosition);
  }

  return positions;
};

/**
 * Custom Layout - User-defined positions (for future drag-and-drop)
 */
const generateCustomLayout = (tables: TableWithGuestCount[]): TablePosition[] => {
  // For now, use grid layout as base
  // In the future, this would use saved user positions
  return generateGridLayout(tables);
};

/**
 * Calculate optimal table size based on guest count and capacity
 */
export const calculateTableSize = (
  guestCount: number,
  capacity: number,
  baseSize: number = 0.1
): { width: number; height: number } => {
  const utilizationFactor = Math.min(1, guestCount / capacity);
  const sizeFactor = 0.8 + (utilizationFactor * 0.4); // 0.8 to 1.2
  
  const width = baseSize * sizeFactor;
  const height = baseSize * sizeFactor;

  return { width, height };
};

/**
 * Check if two table positions overlap
 */
export const tablesOverlap = (pos1: TablePosition, pos2: TablePosition): boolean => {
  return !(
    pos1.x + pos1.width <= pos2.x ||
    pos2.x + pos2.width <= pos1.x ||
    pos1.y + pos1.height <= pos2.y ||
    pos2.y + pos2.height <= pos1.y
  );
};

/**
 * Find the optimal spacing between tables
 */
export const calculateOptimalSpacing = (
  tableCount: number,
  containerWidth: number = 1,
  containerHeight: number = 1
): { horizontal: number; vertical: number } => {
  const cols = Math.ceil(Math.sqrt(tableCount));
  const rows = Math.ceil(tableCount / cols);

  const horizontal = containerWidth / (cols + 1);
  const vertical = containerHeight / (rows + 1);

  return { horizontal, vertical };
};