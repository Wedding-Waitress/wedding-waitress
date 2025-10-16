import React from 'react';
import { 
  Home, 
  Calendar, 
  Users, 
  MapPin, 
  QrCode, 
  CreditCard,
  ChefHat,
  Monitor,
  Camera,
  LayoutGrid,
  FileText,
  LogOut,
  Shield
} from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onSignOut: () => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "my-events", label: "My Events", icon: Calendar },
  { id: "table-list", label: "Tables", icon: MapPin },
  { id: "guest-list", label: "Guest List", icon: Users },
  { id: "photo-video-sharing", label: "Photo & Video Sharing", icon: Camera },
  { id: "qr-code", label: "QR Code Seating Chart", icon: QrCode },
  { id: "place-cards", label: "Place Cards", icon: CreditCard },
  { id: "individual-table-chart", label: "Individual Table Charts", icon: Users },
  { id: "dietary-chart", label: "Dietary Requirements", icon: ChefHat },
  { id: "full-seating-chart", label: "Full Seating Chart", icon: FileText },
  { id: "kiosk-live-view", label: "Kiosk Live View", icon: Monitor },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onTabChange,
  onSignOut
}) => {
  const { open } = useSidebar();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" className="border-r border-border pt-16">
      <SidebarContent className="pt-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-base font-bold text-black dark:text-black mb-3">
            Dashboard Menu
          </SidebarGroupLabel>
          <Separator className="mb-3" />
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              
              {/* Admin Panel button (only for admins) */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin')}
                    tooltip="Admin Panel"
                    style={{ borderLeft: '3px solid #6D28D9' }}
                  >
                    <Shield className="w-5 h-5" style={{ color: '#6D28D9' }} />
                    <span style={{ color: '#6D28D9' }}>Admin Panel</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {/* Logout button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onSignOut}
                  tooltip="Logout"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
