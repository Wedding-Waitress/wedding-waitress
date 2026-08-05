import React from 'react';
import { 
  Home, 
  Calendar, 
  Users, 
  QrCode, 
  CreditCard,
  Monitor,
  LayoutGrid,
  FileText,
  LogOut,
  Shield,
  ClipboardList,
  Music,
  Mail,
  UserCircle,
  ChevronUp,
  Sparkles,
  LifeBuoy,
  Gift,
  Camera,
  Table,
  Table2,
  Signpost,
  UtensilsCrossed
} from 'lucide-react';

import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useUserPlan } from '@/hooks/useUserPlan';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useIsOwnerAdmin } from '@/hooks/useIsOwnerAdmin';
import { AdminOtpModal } from '@/components/Admin/AdminOtpModal';
import { GetHelpModal } from '@/components/Support/GetHelpModal';
import { UpgradePlanModal } from '@/components/Subscription/UpgradePlanModal';
import { ReferralRewardsModal } from '@/components/Referral/ReferralRewardsModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfile } from '@/hooks/useProfile';
// Feature flags removed
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    { id: "signage", label: "Seating Chart Signs", icon: Printer },
    { id: "invitations", label: "Invitations & Cards", icon: Mail },
    { id: "place-cards", label: "Name Place Cards", icon: CreditCard },
    { id: "individual-table-chart", label: "Individual Table Charts", icon: Users },
    { id: "floor-plan", label: "Floor Plan", icon: LayoutGrid },
    { id: "dietary-chart", label: "Dietary Requirements", icon: ChefHat },
    { id: "full-seating-chart", label: "Full Seating Chart", icon: FileText },
    { id: "kiosk-live-view", label: "Kiosk Live View", icon: Monitor },
    { id: "dj-mc-questionnaire", label: "DJ & MC Questionnaire", icon: Music },
    { id: "running-sheet", label: "Run Sheet", icon: ClipboardList },
    { id: "photo-video-gallery", label: "Photo & Video Sharing", icon: Camera },
  ];
  
  const menuItems = allMenuItems;

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onTabChange,
  onSignOut
}) => {
  const { open, isMobile, setOpenMobile } = useSidebar();
  const handleItemClick = React.useCallback((id: string) => {
    onTabChange(id);
    if (isMobile) setOpenMobile(false);
  }, [onTabChange, isMobile, setOpenMobile]);
  const { isAdmin } = useIsAdmin();
  const { isOwnerAdmin } = useIsOwnerAdmin();
  const [otpOpen, setOtpOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [referralOpen, setReferralOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // isMobile already destructured from useSidebar above
  const { profile } = useProfile();
  const { plan } = useUserPlan();

  const planDisplayName = (() => {
    const raw = plan?.plan_name?.trim();
    if (!raw || raw.toLowerCase() === 'starter' || raw.toLowerCase() === 'free') return 'Free';
    return raw;
  })();


  const userInitials = (() => {
    const f = profile?.first_name?.[0] || '';
    const l = profile?.last_name?.[0] || '';
    if (f || l) return (f + l).toUpperCase();
    return (profile?.email?.[0] || 'U').toUpperCase();
  })();

  const userDisplayName = (() => {
    const f = profile?.first_name || '';
    const l = profile?.last_name || '';
    const full = `${f} ${l}`.trim();
    if (full) return full;
    if (profile?.email) return profile.email.split('@')[0];
    return 'User';
  })();

  // Mobile labels match desktop sidebar exactly (no abbreviations)
  const getMobileLabel = (_id: string, label: string) => label;


  return (
    <Sidebar collapsible="icon" className="dashboard-sidebar border-r border-border shadow-2xl">
      <SidebarHeader className={isMobile ? 'pt-6 pb-4' : 'pt-16 pb-12'}>
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
            <SidebarMenu className="gap-1">
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
                
                return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleItemClick(item.id)}
                    isActive={isActive}
                    tooltip={item.label}
                    className={`flex items-center gap-1 ${isGreenItem ? `border border-[#967A59] rounded-md ${isActive ? '!bg-[#EDE5DB]' : '!bg-[#F5F0EB] hover:!bg-[#EDE5DB]'}` : ''} ${isMobile ? 'py-4' : 'py-3'}`}
                  >
                    <Icon className={isMobile ? "w-6 h-6" : "w-5 h-5"} style={isGreenItem ? { color: '#967A59' } : undefined} />
                    <span className={`${isActive ? 'font-bold' : 'font-normal'} text-base`} style={isGreenItem ? { color: '#967A59' } : undefined}>
                      {getMobileLabel(item.id, item.label)}
                    </span>
                    {item.id === 'my-events' && (
                       <span className="bg-green-500 text-white text-xs font-normal ml-auto px-2 py-0.5 rounded-full whitespace-nowrap">
                        Start Here
                       </span>
                    )}
                    {item.id === 'table-list' && (
                       <span className="text-sm font-normal ml-auto" style={{ color: '#967A59' }}>
                        Create
                      </span>
                    )}
                    {item.id === 'guest-list' && (
                       <span className="text-sm font-normal ml-auto" style={{ color: '#967A59' }}>
                        Add
                      </span>
                    )}
                    {badgeNumber && (
                      <span className="flex items-center justify-center w-6 h-6 bg-[#F5F0EB] rounded-full text-sm font-normal ml-1" style={{ color: '#967A59' }}>
                        {badgeNumber}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
              })}
              
              {/* Admin Panel moved to user dropdown; logout lives in dropdown only */}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-[#E8E1D6]/70 mt-3 pt-3 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={userDisplayName}
                  className="data-[state=open]:bg-[#F5F0EB] hover:bg-[#F5F0EB] rounded-lg transition-colors duration-200 py-3"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-semibold shadow-sm"
                    style={{ backgroundColor: '#967A59' }}
                  >
                    {userInitials}
                  </div>
                  <div className="flex flex-col text-left leading-tight overflow-hidden">
                    <span className="text-sm font-medium truncate text-foreground">
                      {userDisplayName}
                    </span>
                    <span className="text-[11px] truncate">
                      <span className="text-muted-foreground/80">Current Plan:</span>
                      <span className="ml-1 text-foreground/90 font-medium">{planDisplayName}</span>
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 opacity-60" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-[--radix-popper-anchor-width] min-w-56 rounded-xl shadow-xl border border-[#E8E1D6]/70 p-1.5"
              >
                <DropdownMenuItem
                  onClick={() => handleItemClick('account')}
                  className="cursor-pointer py-2.5 px-3 rounded-lg focus:bg-[#F5F0EB]"
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  My Account
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setUpgradeOpen(true)}
                  className="cursor-pointer py-2.5 px-3 rounded-lg focus:bg-[#F5F0EB]"
                >
                  <Sparkles className="mr-2 h-4 w-4" style={{ color: '#967A59' }} />
                  Upgrade Plan
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setHelpOpen(true)}
                  className="cursor-pointer py-2.5 px-3 rounded-lg focus:bg-[#F5F0EB]"
                >
                  <LifeBuoy className="mr-2 h-4 w-4" style={{ color: '#967A59' }} />
                  Get Help
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setReferralOpen(true)}
                  className="cursor-pointer py-2.5 px-3 rounded-lg focus:bg-[#F5F0EB]"
                >
                  <Gift className="mr-2 h-4 w-4" style={{ color: '#967A59' }} />
                  Referral / Affiliate Rewards
                </DropdownMenuItem>
                {isOwnerAdmin && (
                  <>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      onClick={() => setOtpOpen(true)}
                      className="cursor-pointer py-2.5 px-3 rounded-lg focus:bg-[#F5F0EB]"
                    >
                      <Shield className="mr-2 h-4 w-4" style={{ color: '#967A59' }} />
                      Admin Panel
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="cursor-pointer py-2.5 px-3 rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {isOwnerAdmin && <AdminOtpModal open={otpOpen} onOpenChange={setOtpOpen} />}
      <GetHelpModal open={helpOpen} onOpenChange={setHelpOpen} />
      <UpgradePlanModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <ReferralRewardsModal open={referralOpen} onOpenChange={setReferralOpen} />
    </Sidebar>
  );
};
