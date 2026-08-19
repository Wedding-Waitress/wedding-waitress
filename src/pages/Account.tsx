import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CreditCard, Lock, LogOut, LifeBuoy, Menu, Sparkles, User, Users, X, type LucideIcon,
} from 'lucide-react';
import {
  Navigate, NavLink, useLocation, useNavigate, useParams, useSearchParams,
} from 'react-router-dom';
import { AccountInfoCard } from '@/components/Account/AccountInfoCard';
import { AccountAccessCard } from '@/components/Account/AccountAccessCard';
import { SecurityCard } from '@/components/Account/SecurityCard';
import { PlanBillingSection } from '@/components/Account/PlanBillingSection';
import { ProfileAvatar } from '@/components/Account/ProfileAvatar';
import {
  HelpSupportSection,
  PlansUpgradesSection,
} from '@/components/Account/AccountDestinations';
import { SeoHead } from '@/components/SEO/SeoHead';
import { useAccountBilling } from '@/hooks/useAccountBilling';
import { useDashboardSession } from '@/hooks/useDashboardSession';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logoImage from '@/assets/wedding-waitress-full-logo.png';
import styles from './Account.module.css';
import controlStyles from '@/components/Account/AccountControls.module.css';

type AccountSection =
  | 'account-info' | 'team-access' | 'plan-billing' | 'plans-upgrades'
  | 'help-support' | 'security-account';

interface SectionDefinition {
  id: AccountSection;
  label: string;
  description: string;
  icon: LucideIcon;
}

const sectionGroups: Array<{ label: string; items: SectionDefinition[] }> = [
  {
    label: 'Account',
    items: [
      { id: 'account-info', label: 'Account Info', description: 'Your personal details', icon: User },
      { id: 'team-access', label: 'Team & Access', description: 'Account holders and team access', icon: Users },
    ],
  },
  {
    label: 'Plan & Billing',
    items: [
      { id: 'plan-billing', label: 'Plan & Billing', description: 'Plan, usage, invoices and payments', icon: CreditCard },
      { id: 'plans-upgrades', label: 'Plans & Upgrades', description: 'Compare plans and upgrade', icon: Sparkles },
    ],
  },
  {
    label: 'Support',
    items: [
      { id: 'help-support', label: 'Help & Support', description: 'Contact Wedding Waitress support', icon: LifeBuoy },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'security-account', label: 'Security & Account', description: 'Password, verification and account controls', icon: Lock },
    ],
  },
];

const allSections = sectionGroups.flatMap((group) => group.items);
const validSections = new Set<AccountSection>(allSections.map((section) => section.id));

const sectionContent: Record<AccountSection, React.ReactNode> = {
  'account-info': <AccountInfoCard icon={User} />,
  'team-access': <AccountAccessCard icon={Users} />,
  'plan-billing': <PlanBillingSection />,
  'plans-upgrades': <PlansUpgradesSection />,
  'help-support': <HelpSupportSection />,
  'security-account': <SecurityCard icon={Lock} />,
};

const legacyRedirects: Record<string, AccountSection> = {
  notifications: 'account-info', subscription: 'plan-billing', billing: 'plan-billing',
  usage: 'plan-billing', history: 'plan-billing', 'privacy-data': 'security-account',
  security: 'security-account', 'access-team': 'team-access', 'referral-rewards': 'account-info',
};

export const Account: React.FC = () => {
  const { section } = useParams<{ section?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { session, loading: sessionLoading } = useDashboardSession();
  const { profile } = useProfile();
  const { refetch } = useAccountBilling();
  const { toast } = useToast();
  const activeSection: AccountSection = section && validSections.has(section as AccountSection)
    ? section as AccountSection : 'account-info';
  const activeDefinition = allSections.find((item) => item.id === activeSection)!;

  useEffect(() => {
    if (searchParams.get('success') !== 'true') return;
    toast({ title: 'Plan upgraded', description: 'Your plan has been upgraded successfully.' });
    refetch();
    const next = new URLSearchParams(searchParams);
    next.delete('success');
    setSearchParams(next, { replace: true });
  }, [refetch, searchParams, setSearchParams, toast]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  const userName = useMemo(() => {
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    return fullName || profile?.email?.split('@')[0] || 'Wedding Waitress user';
  }, [profile]);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  if (location.pathname === '/dashboard') return <Navigate to="/account/account-info" replace />;
  if (section && legacyRedirects[section]) return <Navigate to={`/account/${legacyRedirects[section]}`} replace />;
  if (!section || !validSections.has(section as AccountSection)) return <Navigate to="/account/account-info" replace />;
  if (sessionLoading) {
    return <div className={styles.loadingScreen} role="status" aria-live="polite"><span className={styles.loadingMark} />Opening Account Centre…</div>;
  }
  if (!session) return <Navigate to="/" replace />;

  const sidebar = (
    <div className={styles.sidebarInner}>
      <div className={styles.brandArea}>
        <img src={logoImage} alt="Wedding Waitress" className={styles.logo} />
        <div className={styles.centreLabel}>Account Centre</div>
      </div>
      <div className={styles.userSummary}>
        <ProfileAvatar profile={profile} className={styles.avatar} />
        <div><strong>{userName}</strong><span>{profile?.email || 'Signed-in account'}</span></div>
      </div>
      <nav className={styles.navigation} aria-label="Account Centre navigation">
        {sectionGroups.map((group) => (
          <div className={styles.navGroup} key={group.label}>
            <h2>{group.label}</h2>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.id} to={`/account/${item.id}`} onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                  <Icon aria-hidden="true" /><span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className={styles.sidebarActions}>
        <NavLink to="/dashboard" className={`${styles.backAction} ${controlStyles.secondaryButton}`} onClick={() => setMobileNavOpen(false)}>
          <ArrowLeft aria-hidden="true" /><span>Back to Wedding Waitress</span>
        </NavLink>
        <button type="button" className={styles.logoutAction} onClick={handleSignOut}>
          <LogOut aria-hidden="true" /><span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.accountCentre}>
      <SeoHead title={`${activeDefinition.label} | Account Centre | Wedding Waitress`} description="Manage your Wedding Waitress account." noIndex />
      <aside className={styles.desktopSidebar}>{sidebar}</aside>
      <button type="button" className={styles.mobileMenuButton} onClick={() => setMobileNavOpen(true)}
        aria-label="Open Account Centre navigation" aria-expanded={mobileNavOpen} aria-controls="account-centre-mobile-nav">
        <Menu aria-hidden="true" /><span>Account Centre</span>
      </button>
      {mobileNavOpen && (
        <div className={styles.mobileNavLayer}>
          <button type="button" className={styles.mobileBackdrop} onClick={() => setMobileNavOpen(false)} aria-label="Close Account Centre navigation" />
          <aside id="account-centre-mobile-nav" className={styles.mobileDrawer} role="dialog" aria-modal="true" aria-label="Account Centre navigation">
            <button type="button" className={styles.mobileClose} onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X aria-hidden="true" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <main className={styles.main}>
        <header className={styles.pageHeader}>
          <span>Account Centre</span><h1 className={styles.pageHeading}>{activeDefinition.label}</h1><p>{activeDefinition.description}</p>
        </header>
        <div className={styles.contentPanel} data-active-account-section={activeSection}>{sectionContent[activeSection]}</div>
      </main>
    </div>
  );
};

export default Account;
