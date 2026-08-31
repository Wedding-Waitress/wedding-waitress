import { ArrowRight, CalendarPlus, Palette, Share2, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';
import { CookieBanner } from '@/components/ui/CookieBanner';
import '@/styles/PublicSite.css';

const stages = [
  { icon: CalendarPlus, title: 'Create Your Event', text: 'Add your wedding date, venues, guest capacity and key event information. My Events becomes the overview for every connected planning tool.', links: [['My Events','/my-events']] },
  { icon: UserPlus, title: 'Build Your Guest List and Tables', text: 'Organise individuals, couples and families, track RSVPs and dietary needs, then create tables and assign seats.', links: [['Guest List & RSVP','/guest-list'],['Tables','/tables']] },
  { icon: Palette, title: 'Design and Prepare Everything', text: 'Create invitations, cards, signage, floor plans, place cards, seating references and kitchen-ready dietary lists from the same event data.', links: [['Invitations & Cards','/invitations-cards'],['Floor Plans','/floor-plan'],['Seating Chart Signs','/seating-chart-signs']] },
  { icon: Share2, title: 'Share With Guests and Run Your Day', text: 'Help guests find seats, brief your DJ and MC, share the run sheet, and bring guest photos, messages and the live slideshow together.', links: [['QR Seating','/qr-code-seating-chart'],['Run Sheet','/running-sheet'],['Photo & Video Sharing','/photo-video-sharing']] },
] as const;

export const HowItWorks = () => (
  <div className="ww-public min-h-screen">
    <SeoHead title="How Wedding Waitress Works | One Connected Wedding Plan" description="See how to create your event, organise guests and tables, prepare every detail, share with guests and run the wedding day in four connected stages." canonicalPath="/how-it-works" />
    <Header />
    <main>
      <section className="ww-section ww-section-cream text-center">
        <div className="ww-container max-w-4xl">
          <p className="ww-eyebrow mb-3">How it works</p>
          <h1 className="ww-display">Four stages from first plan to wedding day</h1>
          <p className="ww-lead mx-auto mt-6 max-w-3xl">Wedding Waitress keeps the information you add connected, so each step supports the stationery, seating, supplier and guest experiences that follow.</p>
        </div>
      </section>
      <section className="ww-section ww-how-process" data-ww-process>
        <div className="ww-container space-y-8">
          {stages.map((stage,index) => (
            <article key={stage.title} data-ww-process-stage className="ww-card grid gap-7 p-7 md:grid-cols-[auto_1fr_.7fr] md:items-center md:p-9">
              <div className="ww-icon-orb"><stage.icon size={23} aria-hidden="true" /></div>
              <div>
                <p className="ww-eyebrow mb-2">Stage {index + 1}</p>
                <h2 className="text-2xl font-semibold">{stage.title}</h2>
                <p className="mt-3 leading-7 text-[#6f625b]">{stage.text}</p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {stage.links.map(([label,path]) => <Link key={path} to={path} className="ww-public-link ww-brand-border ww-focus rounded-full border px-4 py-2 text-sm font-semibold hover:bg-[#f6efe5]">{label}</Link>)}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="ww-section ww-section-cream text-center">
        <div className="ww-container max-w-3xl">
          <h2 className="ww-title">Begin with the details you already know</h2>
          <p className="ww-lead mt-5">Try the complete platform for seven days with up to 20 guests. No credit card required.</p>
          <AuthGatedCtaLink to="/dashboard" alwaysSignUp className="ww-button-primary ww-focus mt-8">Start Planning Free <ArrowRight size={18} aria-hidden="true" /></AuthGatedCtaLink>
        </div>
      </section>
    </main>
    <PublicFooter />
    <CookieBanner />
  </div>
);
