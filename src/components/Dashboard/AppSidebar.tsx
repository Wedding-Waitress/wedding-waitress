import React from 'react';
import { 
  Home, 
  LogOut,
  Shield,
  UserCircle,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useUserPlan } from '@/hooks/useUserPlan';
import { AdminOtpModal } from '@/components/Admin/AdminOtpModal';
import { useNavigate } from 'react-router-dom';
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
import styles from './AppSidebar.module.css';
import { ProfileAvatar } from '@/components/Account/ProfileAvatar';
import { productNavigationItems } from '@/config/productNavigation';
import { loadAccountRoute, loadAdminRoute } from '@/lib/authenticatedRoutePreload';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabIntent?: (tabId: string) => void;
  onSignOut: () => void;
}

  // Filter menu items based on feature flags
  const allMenuItems = [
    { id: "dashboard", label: "Event Budget Planner", icon: Home },
    ...productNavigationItems.map(({ sidebarId, sidebarLabel, icon }) => ({ id: sidebarId, label: sidebarLabel, icon })),
  ];
  
  const menuItems = allMenuItems;

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onTabChange,
  onTabIntent,
  onSignOut
}) => {
  const { open, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const isSidebarExpanded = isMobile || open;
  const handleItemClick = React.useCallback((id: string) => {
    onTabChange(id);
    if (isMobile) setOpenMobile(false);
  }, [onTabChange, isMobile, setOpenMobile]);
  const { isAdmin } = useIsAdmin();
  const [otpOpen, setOtpOpen] = React.useState(false);
  const navigate = useNavigate();
  // isMobile already destructured from useSidebar above
  const { profile } = useProfile();
  const { plan } = useUserPlan();

  const planDisplayName = (() => {
    const raw = plan?.plan_name?.trim();
    if (!raw || raw.toLowerCase() === 'starter' || raw.toLowerCase() === 'free') return 'Free';
    return raw;
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
    <Sidebar collapsible="icon" className={`dashboard-sidebar ${styles.sidebarRoot}`}>
      <SidebarHeader className={`${styles.header} ${isMobile ? 'pt-6 pb-4' : 'pt-6 pb-12'}`}>
        <div className="flex items-center justify-center px-4">
          <img 
            src={logoImage} 
            alt="Wedding Waitress" 
            className={`${styles.logo} h-12 sm:h-10 md:h-14 w-auto group-data-[collapsible=icon]:!h-auto group-data-[collapsible=icon]:!w-9`}
          />
        </div>
      </SidebarHeader>
      <SidebarContent className={`${styles.content} pt-2`}>
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
                    onPointerEnter={() => onTabIntent?.(item.id)}
                    onPointerDown={() => onTabIntent?.(item.id)}
                    onFocus={() => onTabIntent?.(item.id)}
                    isActive={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    tooltip={item.label}
                    className={`${styles.navButton} ${isGreenItem ? styles.specialNav : ''} flex items-center gap-2 ${isMobile ? 'py-4' : 'py-3'}`}
                  >
                    <Icon size={18} strokeWidth={1.8} className="!w-[18px] !h-[18px] shrink-0" />
                    <span className={`${isGreenItem ? styles.specialText : ''} ${isActive ? 'font-bold' : 'font-normal'} text-base`}>
                      {getMobileLabel(item.id, item.label)}
                    </span>
                    {item.id === 'my-events' && (
                       <span className="bg-green-500 text-white text-xs font-normal ml-auto px-2 py-0.5 rounded-full whitespace-nowrap">
                        Start Here
                       </span>
                    )}
                    {item.id === 'table-list' && (
                       <span className={`${styles.specialAction} text-sm font-normal ml-auto`}>
                        Create
                      </span>
                    )}
                    {item.id === 'guest-list' && (
                       <span className={`${styles.specialAction} text-sm font-normal ml-auto`}>
                        Add
                      </span>
                    )}
                    {badgeNumber && (
                      <span className={`${styles.countBadge} flex items-center justify-center w-6 h-6 rounded-full text-sm font-normal ml-1`}>
                        {badgeNumber}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem aria-hidden="true" className="px-2 py-1">
                <div className={`${styles.divider} h-px w-full`} />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleSidebar}
                  tooltip={isSidebarExpanded ? 'Collapse Menu' : 'Expand Menu'}
                  aria-label={isSidebarExpanded ? 'Collapse Menu' : 'Expand Menu'}
                  className={`${styles.navButton} ${styles.collapseButton} flex items-center gap-2 ${isMobile ? 'py-4' : 'py-3'}`}
                >
                  {isSidebarExpanded ? (
                    <PanelLeftClose size={18} strokeWidth={1.8} className="!h-[18px] !w-[18px] shrink-0" />
                  ) : (
                    <PanelLeftOpen size={18} strokeWidth={1.8} className="!h-[18px] !w-[18px] shrink-0" />
                  )}
                  <span className="text-base font-normal">
                    {isSidebarExpanded ? 'Collapse Menu' : 'Expand Menu'}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Admin Panel moved to user dropdown; logout lives in dropdown only */}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className={`${styles.footer} border-t mt-3 pt-3 p-2`}>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={userDisplayName}
                  className={`${styles.accountButton} rounded-lg transition-colors duration-200 py-3`}
                >
                  <ProfileAvatar
                    profile={profile}
                    className="h-8 w-8 bg-[#967A59] text-white text-xs font-semibold shadow-sm"
                  />
                  <div className="flex flex-col text-left leading-tight overflow-hidden">
                    <span className={`${styles.accountName} text-sm font-medium truncate`}>
                      {userDisplayName}
                    </span>
                    <span className="text-[11px] truncate">
                      <span className={styles.accountMeta}>Current Plan:</span>
                      <span className={`${styles.accountPlan} ml-1 font-medium`}>{planDisplayName}</span>
                    </span>
                  </div>
                  <ChevronUp className={`${styles.accountChevron} ml-auto h-4 w-4 opacity-80`} />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className={`${styles.accountMenu} w-[--radix-popper-anchor-width] min-w-56 rounded-xl p-1.5`}
              >
                <DropdownMenuItem
                  onClick={() => navigate('/account/account-info')}
                  onPointerEnter={() => void loadAccountRoute()}
                  onPointerDown={() => void loadAccountRoute()}
                  onFocus={() => void loadAccountRoute()}
                  className={`${styles.accountMenuItem} cursor-pointer py-2.5 px-3 rounded-lg`}
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  My Account
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator className={`${styles.accountMenuSeparator} my-1`} />
                    <DropdownMenuItem
                      onClick={() => setOtpOpen(true)}
                      onPointerEnter={() => void loadAdminRoute()}
                      onPointerDown={() => void loadAdminRoute()}
                      onFocus={() => void loadAdminRoute()}
                      className={`${styles.accountMenuItem} cursor-pointer py-2.5 px-3 rounded-lg`}
                    >
                      <Shield className="mr-2 h-4 w-4" style={{ color: '#967A59' }} />
                      Admin Panel
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className={`${styles.accountMenuSeparator} my-1`} />
                <DropdownMenuItem
                  onClick={onSignOut}
                  className={`${styles.logoutItem} cursor-pointer py-2.5 px-3 rounded-lg`}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {isAdmin && <AdminOtpModal open={otpOpen} onOpenChange={setOtpOpen} />}
    </Sidebar>
  );
};
