import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  Camera,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutGrid,
  Mail,
  Presentation,
  Music,
  QrCode,
  Signpost,
  Table,
  Table2,
  Users,
  UtensilsCrossed,
} from 'lucide-react';

export interface ProductNavigationItem {
  productId: string;
  sidebarId: string;
  sidebarLabel: string;
  icon: LucideIcon;
}

/**
 * Authoritative product-to-icon mapping shared by the authenticated sidebar
 * and every public product navigation surface.
 */
export const productNavigationItems: ProductNavigationItem[] = [
  { productId: 'my-events', sidebarId: 'my-events', sidebarLabel: 'My Events', icon: Calendar },
  { productId: 'tables', sidebarId: 'table-list', sidebarLabel: 'Tables', icon: Table },
  { productId: 'guest-list', sidebarId: 'guest-list', sidebarLabel: 'Guest List', icon: Users },
  { productId: 'qr-code-seating-chart', sidebarId: 'qr-code', sidebarLabel: 'QR Code Seating Chart', icon: QrCode },
  { productId: 'seating-chart-signs', sidebarId: 'signage', sidebarLabel: 'Seating Chart Signs', icon: Signpost },
  { productId: 'invitations-cards', sidebarId: 'invitations', sidebarLabel: 'Invitations & Cards', icon: Mail },
  { productId: 'name-place-cards', sidebarId: 'place-cards', sidebarLabel: 'Name Place Cards', icon: CreditCard },
  { productId: 'individual-table-charts', sidebarId: 'individual-table-chart', sidebarLabel: 'Individual Table Charts', icon: Table2 },
  { productId: 'floor-plan', sidebarId: 'floor-plan', sidebarLabel: 'Floor Plan', icon: LayoutGrid },
  { productId: 'dietary-requirements', sidebarId: 'dietary-chart', sidebarLabel: 'Dietary Requirements', icon: UtensilsCrossed },
  { productId: 'full-seating-chart', sidebarId: 'full-seating-chart', sidebarLabel: 'Full Seating Chart', icon: FileText },
  { productId: 'live-slideshow', sidebarId: 'live-slideshow', sidebarLabel: 'Live Slideshow', icon: Presentation },
  { productId: 'dj-mc-questionnaire', sidebarId: 'dj-mc-questionnaire', sidebarLabel: 'DJ & MC Questionnaire', icon: Music },
  { productId: 'running-sheet', sidebarId: 'running-sheet', sidebarLabel: 'Run Sheet', icon: ClipboardList },
  { productId: 'photo-video-sharing', sidebarId: 'photo-video-gallery', sidebarLabel: 'Photo & Video Sharing', icon: Camera },
];

export const productIconById: Record<string, LucideIcon> = Object.fromEntries(
  productNavigationItems.map(({ productId, icon }) => [productId, icon]),
);
