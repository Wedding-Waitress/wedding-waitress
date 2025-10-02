import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Users, 
  MapPin, 
  Mail, 
  Gift, 
  QrCode, 
  ClipboardList, 
  Handshake, 
  Heart,
  Printer,
  Monitor,
  CreditCard,
  LogOut
} from 'lucide-react';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onSignOut: () => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "my-events", label: "My Events", icon: Calendar },
  { id: "table-list", label: "Tables", icon: MapPin },
  { id: "guest-list", label: "Guest List", icon: Users },
  { id: "qr-code", label: "QR Code Seating Chart", icon: QrCode },
  { id: "printables", label: "Printables", icon: Printer },
  { id: "place-cards", label: "Place Cards", icon: CreditCard },
  { id: "kiosk-live-view", label: "Kiosk Live View", icon: Monitor },
  { id: "floor-plan", label: "Floor Plan", icon: MapPin },
  { id: "rsvp-invite", label: "RSVP Invite", icon: Mail },
  { id: "wishing-well", label: "Online Wishing Well", icon: Gift },
  { id: "planner", label: "Planner", icon: ClipboardList },
  { id: "vendor-team", label: "Vendor Team", icon: Handshake },
];

const SidebarMenuContent = ({ activeTab, onTabChange, onSignOut }: { activeTab: string; onTabChange: (tabId: string) => void; onSignOut: () => void }) => {
  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Menu Items */}
      <div className="flex-1 px-4 py-6">
        <nav className="space-y-2" role="navigation" aria-label="Dashboard navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 touch-target ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Logout button */}
          <button
            onClick={onSignOut}
            className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 touch-target text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </nav>
      </div>

    </div>
  );
};

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onTabChange,
  onSignOut
}) => {
  return (
    <div className="w-[252px] h-screen sticky top-0">
      <SidebarMenuContent 
        activeTab={activeTab} 
        onTabChange={onTabChange}
        onSignOut={onSignOut}
      />
    </div>
  );
};