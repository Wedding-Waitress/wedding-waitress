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
  LayoutGrid,
  FileText,
  LogOut,
  Shield,
  ClipboardList,
  Music,
  Mail
} from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
// Feature flags removed
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import logoImage from '@/assets/wedding-waitress-full-logo.png';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onSignOut: () => void;
}

  // Filter menu items based on feature flags
  const allMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "my-events", label: "My Events", icon: Calendar },
    { id: "table-list", label: "Tables", icon: MapPin },
    { id: "guest-list", label: "Guest List", icon: Users },
    { id: "qr-code", label: "QR Code Seating Chart", icon: QrCode },
    { id: "invitations", label: "Invitations & Cards", icon: Mail },
    { id: "place-cards", label: "Name Place Cards", icon: CreditCard },
    { id: "individual-table-chart", label: "Individual Table Charts", icon: Users },
    { id: "floor-plan", label: "Floor Plan", icon: LayoutGrid },
    { id: "dietary-chart", label: "Dietary Requirements", icon: ChefHat },
    { id: "full-seating-chart", label: "Full Seating Chart", icon: FileText },
    { id: "kiosk-live-view", label: "Kiosk Live View", icon: Monitor },
    { id: "dj-mc-questionnaire", label: "DJ-MC Questionnaire", icon: Music },
    { id: "running-sheet", label: "Running Sheet", icon: ClipboardList },
  ];
  
  const menuItems = allMenuItems;

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onTabChange,
  onSignOut
}) => {
  const { open } = useSidebar();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Mobile-friendly label shortening
  const getMobileLabel = (id: string, label: string) => {
    if (!isMobile) return label;
    
    const mobileLabels: Record<string, string> = {
      "qr-code": "QR Chart",
      "individual-table-chart": "Table Charts",
      "kiosk-live-view": "Kiosk View",
      "dietary-chart": "Dietary Req.",
      "full-seating-chart": "Seating Chart",
    };
    
    return mobileLabels[id] || label;
  };


  return (
    {/* 🔒 LOCKED DASHBOARD UI (2026-04-19) — DO NOT MODIFY without explicit owner approval */}
    <Sidebar collapsible="icon" className="border-r border-[#E8E1D6]/60 shadow-[2px_0_16px_-6px_rgba(150,122,89,0.14)]">
      <SidebarHeader className="pt-16 pb-12">
        <div className="flex items-center justify-center px-4">
          <img 
            src={logoImage} 
            alt="Wedding Waitress" 
            className="h-12 sm:h-10 md:h-14 w-auto" 
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                const isGreenItem = ['my-events', 'table-list', 'guest-list'].includes(item.id);
                const getBadgeNumber = () => {
                  if (item.id === 'my-events') return '1';
                  if (item.id === 'table-list') return '2';
                  if (item.id === 'guest-list') return '3';
                  return null;
                };
                const badgeNumber = getBadgeNumber();
                const activeStyles = isActive && !isGreenItem
                  ? '!bg-[#967A59]/10 !text-[#967A59] border-l-[3px] border-[#967A59] rounded-md'
                  : 'hover:bg-[#967A59]/5';
                
                return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id)}
                    isActive={isActive}
                    tooltip={item.label}
                    className={`flex items-center gap-1 ${isGreenItem ? '!bg-[#F5F0EB] border border-[#967A59] rounded-md hover:!bg-[#EDE5DB]' : activeStyles} ${isMobile ? 'py-4' : 'py-2.5'}`}
                  >
                    <Icon className={isMobile ? "w-6 h-6" : "w-5 h-5"} />
                    <span className={`${isGreenItem ? 'text-black' : ''} ${isActive ? 'font-bold' : 'font-normal'} text-base`}>
                      {getMobileLabel(item.id, item.label)}
                    </span>
                    {item.id === 'my-events' && (
                       <span className="bg-green-500 text-white text-xs font-normal ml-auto px-2 py-0.5 rounded-full whitespace-nowrap">
                        Start Here
                       </span>
                    )}
                    {item.id === 'table-list' && (
                       <span className="text-black text-sm font-normal ml-auto">
                        Create
                      </span>
                    )}
                    {item.id === 'guest-list' && (
                       <span className="text-black text-sm font-normal ml-auto">
                        Add
                      </span>
                    )}
                    {badgeNumber && (
                      <span className="flex items-center justify-center w-6 h-6 bg-[#F5F0EB] rounded-full text-black text-sm font-normal ml-1">
                        {badgeNumber}
                      </span>
                    )}
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
                    style={{ borderLeft: '3px solid #967A59' }}
                  >
                    <Shield className="w-5 h-5" style={{ color: '#967A59' }} />
                    <span className="font-medium text-base" style={{ color: '#967A59' }}>Admin Panel</span>
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
                  <span className="font-medium text-base">Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
