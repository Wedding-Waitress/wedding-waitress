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
  Settings, 
  Heart,
  Menu,
  X,
  Printer
} from 'lucide-react';
import { Button } from "@/components/ui/enhanced-button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "my-events", label: "My Events", icon: Calendar },
  { id: "table-list", label: "Tables", icon: MapPin },
  { id: "guest-list", label: "Guest List", icon: Users },
  { id: "qr-code", label: "QR Code Seating Chart", icon: QrCode },
  { id: "printables", label: "Printables", icon: Printer },
  { id: "floor-plan", label: "Floor Plan", icon: MapPin },
  { id: "rsvp-invite", label: "RSVP Invite", icon: Mail },
  { id: "wishing-well", label: "Online Wishing Well", icon: Gift },
  { id: "planner", label: "Planner", icon: ClipboardList },
  { id: "vendor-team", label: "Vendor Team", icon: Handshake },
];

const SidebarMenuContent = ({ activeTab, onTabChange, onClose }: { activeTab: string; onTabChange: (tabId: string) => void; onClose?: () => void }) => {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">Wedding Waitress</h1>
            <p className="text-xs text-muted-foreground">Your Wedding & Event Assistant</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 px-4 py-6">
        <nav className="space-y-2" role="navigation" aria-label="Dashboard navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onClose?.();
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
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
        </nav>
      </div>

      {/* Account at bottom */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => {
            onTabChange('account');
            onClose?.();
          }}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            activeTab === 'account'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground'
          }`}
          aria-current={activeTab === 'account' ? 'page' : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">Account</span>
        </button>
      </div>
    </div>
  );
};

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onTabChange
}) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleClose = () => setIsOpen(false);

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-4 left-4 z-50 lg:hidden bg-background border border-border shadow-sm"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="p-0 w-[252px]"
          onInteractOutside={handleClose}
        >
          <SidebarMenuContent 
            activeTab={activeTab} 
            onTabChange={onTabChange}
            onClose={handleClose}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="w-[252px] h-screen sticky top-0">
      <SidebarMenuContent 
        activeTab={activeTab} 
        onTabChange={onTabChange}
      />
    </div>
  );
};