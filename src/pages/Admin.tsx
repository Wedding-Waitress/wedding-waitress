import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CreditCard, LayoutDashboard, LogOut, Menu, RotateCcw, ShieldCheck, Users, X, type LucideIcon } from 'lucide-react';
import { Navigate, NavLink, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { ProfileAvatar } from '@/components/Account/ProfileAvatar';
import { SeoHead } from '@/components/SEO/SeoHead';
import { AdminOverviewPage, AdminCustomersPage, AdminSubscriptionsPaymentsPage, AdminEventsPage, AdminAccountLifecyclePage } from '@/components/Admin/AdminCentrePages';
import logoImage from '@/assets/wedding-waitress-full-logo.png';
import styles from './Admin.module.css';

export type AdminSection = 'overview' | 'customers' | 'subscriptions-payments' | 'events' | 'account-lifecycle';
type Item = { id: AdminSection; label: string; description: string; icon: LucideIcon };
const groups: Array<{ label: string; items: Item[] }> = [
  { label: 'Management', items: [
    { id: 'overview', label: 'Overview', description: 'Operational health and recent activity', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', description: 'Customer records, access and activity', icon: Users },
    { id: 'subscriptions-payments', label: 'Subscriptions & Payments', description: 'Plans, purchases and payment status', icon: CreditCard },
    { id: 'events', label: 'Events', description: 'Event activity, ownership and usage', icon: CalendarDays },
  ] },
  { label: 'Account Control', items: [
    { id: 'account-lifecycle', label: 'Account Lifecycle', description: 'Closures, recovery and permanent deletion', icon: RotateCcw },
  ] },
];
const items = groups.flatMap((group) => group.items);
const valid = new Set(items.map((item) => item.id));
const legacy: Record<string, AdminSection> = {
  users: 'customers', venues: 'customers', subscriptions: 'subscriptions-payments', payments: 'subscriptions-payments',
  'closed-accounts': 'account-lifecycle', invitations: 'overview', settings: 'overview', notifications: 'overview', logs: 'overview',
  'feature-flags': 'overview', maintenance: 'overview', 'data-tools': 'overview',
};
const content: Record<AdminSection, React.ReactNode> = {
  overview: <AdminOverviewPage />, customers: <AdminCustomersPage />,
  'subscriptions-payments': <AdminSubscriptionsPaymentsPage />, events: <AdminEventsPage />,
  'account-lifecycle': <AdminAccountLifecyclePage />,
};

export const Admin: React.FC = () => {
  const { section } = useParams<{ section?: string }>();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { profile } = useProfile();
  const [authLoading, setAuthLoading] = useState(true);
  const [grantValid, setGrantValid] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const grant = sessionStorage.getItem('ww_admin_grant');
      if (!data.session) { navigate('/', { replace: true }); return; }
      if (grant) {
        try {
          const parsed = JSON.parse(atob(grant)) as { user_id?: string; exp?: number };
          setGrantValid(parsed.user_id === data.session.user.id && Number(parsed.exp) > Date.now());
        } catch { setGrantValid(false); }
      }
      setAuthLoading(false);
    });
  }, [navigate]);
  useEffect(() => {
    if (adminLoading || authLoading) return;
    if (!isAdmin || !grantValid) navigate('/dashboard', { replace: true });
  }, [adminLoading, authLoading, grantValid, isAdmin, navigate]);
  useEffect(() => {
    if (!mobileOpen) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', close); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const active = (section && valid.has(section as AdminSection) ? section : 'overview') as AdminSection;
  const definition = items.find((item) => item.id === active)!;
  const name = useMemo(() => [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Administrator', [profile]);
  if (location.pathname === '/admin') { const oldTab = params.get('tab'); return <Navigate to={`/admin/${oldTab ? legacy[oldTab] || 'overview' : 'overview'}`} replace />; }
  if (section && legacy[section]) return <Navigate to={`/admin/${legacy[section]}`} replace />;
  if (section && !valid.has(section as AdminSection)) return <Navigate to="/admin/overview" replace />;
  if (adminLoading || authLoading) return <div className={styles.loading} role="status"><span />Opening Admin Centre…</div>;
  if (!isAdmin || !grantValid) return null;

  const signOut = async () => { sessionStorage.removeItem('ww_admin_grant'); sessionStorage.removeItem('ww_admin_grant_sig'); await supabase.auth.signOut(); navigate('/', { replace: true }); };
  const sidebar = <div className={styles.sidebarInner}>
    <div className={styles.brand}><img src={logoImage} alt="Wedding Waitress" /><span>Admin Centre</span></div>
    <div className={styles.adminCard}><ProfileAvatar profile={profile} className={styles.avatar} /><div><strong>{name}</strong><span>{profile?.email || 'Authorised administrator'}</span><em><ShieldCheck />Owner Administrator · Verified</em></div></div>
    <nav className={styles.navigation} aria-label="Admin Centre navigation">{groups.map((group) => <section key={group.label}><h2>{group.label}</h2>{group.items.map((item) => { const Icon = item.icon; return <NavLink key={item.id} to={`/admin/${item.id}`} onClick={() => setMobileOpen(false)} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}><Icon /><span>{item.label}</span></NavLink>; })}</section>)}</nav>
    <div className={styles.actions}><NavLink to="/dashboard" className={styles.back}><ArrowLeft />Back to Wedding Waitress</NavLink><button type="button" className={styles.logout} onClick={() => void signOut()}><LogOut />Log Out</button></div>
  </div>;
  return <div className={styles.adminCentre}>
    <SeoHead title={`${definition.label} | Admin Centre | Wedding Waitress`} description="Wedding Waitress administration." noIndex />
    <aside className={styles.desktop}>{sidebar}</aside>
    <button type="button" className={styles.mobileTrigger} onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen} aria-controls="admin-mobile-nav"><Menu />Admin Centre</button>
    {mobileOpen && <div className={styles.mobileLayer}><button type="button" className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-label="Close Admin Centre navigation" /><aside id="admin-mobile-nav" className={styles.drawer} role="dialog" aria-modal="true" aria-label="Admin Centre navigation"><button type="button" className={styles.close} onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button>{sidebar}</aside></div>}
    <main className={styles.main}><header className={styles.pageHeader}><span>Admin Centre</span><h1>{definition.label}</h1><p>{definition.description}</p></header><div className={styles.content}>{content[active]}</div></main>
  </div>;
};
export default Admin;
