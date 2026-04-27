import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, MapPin, QrCode, Mail, Calendar, Layout, ClipboardList, CreditCard, Grid3X3, UtensilsCrossed, FileText, Monitor, Mic } from 'lucide-react';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';

import featureGuestlist from '@/assets/feature-guestlist.jpg';
import featureTables from '@/assets/feature-tables.jpg';
import featureQr from '@/assets/feature-qr.jpg';
import featureTimeline from '@/assets/feature-timeline.jpg';
import featureInvitations from '@/assets/feature-invitations.jpg';
import featureMyevents from '@/assets/feature-myevents.jpg';
import featurePlacecards from '@/assets/feature-placecards.jpg';
import featureTablecharts from '@/assets/feature-tablecharts.jpg';
import featureDietary from '@/assets/feature-dietary.jpg';
import featureSeatingchart from '@/assets/feature-seatingchart.jpg';
import featureKiosk from '@/assets/feature-kiosk.jpg';
import featureDjmc from '@/assets/feature-djmc.jpg';
import featureFloorplan from '@/assets/feature-floorplan.jpg';

export const Products: React.FC = () => {
  const { t } = useTranslation('landing');

  const featureCardAlts: Record<string, string> = {
    guestList: 'Wedding guest list manager with RSVP tracking',
    tables: 'Wedding table seating arrangement planner',
    qr: 'QR code wedding seating chart scanner',
    invitations: 'Digital wedding invitations with online RSVP',
    runningSheet: 'Wedding day timeline and event schedule',
    floorPlan: 'Wedding venue floor plan layout designer',
    myEvents: 'Wedding event management dashboard',
    placeCards: 'Printed wedding name place cards',
    tableCharts: 'Individual wedding table seating charts',
    dietary: 'Wedding guest dietary requirements tracker',
    seatingChart: 'Full wedding seating chart overview',
    kiosk: 'Wedding venue self-service check-in kiosk',
    djmc: 'Wedding DJ and MC music questionnaire',
  };

  const productCards = [
    { key: 'myEvents', img: featureMyevents, icon: ClipboardList, route: '/my-events' },
    { key: 'guestList', img: featureGuestlist, icon: Users, route: '/guest-list' },
    { key: 'tables', img: featureTables, icon: MapPin, route: '/tables' },
    { key: 'qr', img: featureQr, icon: QrCode, route: '/qr-code-seating-chart' },
    { key: 'invitations', img: featureInvitations, icon: Mail, route: '/invitations-cards' },
    { key: 'runningSheet', img: featureTimeline, icon: Calendar, route: '/running-sheet-product' },
    { key: 'floorPlan', img: featureFloorplan, icon: Layout, route: '/floor-plan' },
    { key: 'placeCards', img: featurePlacecards, icon: CreditCard, route: '/name-place-cards' },
    { key: 'tableCharts', img: featureTablecharts, icon: Grid3X3, route: '/individual-table-charts' },
    { key: 'dietary', img: featureDietary, icon: UtensilsCrossed, route: '/dietary-requirements' },
    { key: 'seatingChart', img: featureSeatingchart, icon: FileText, route: '/full-seating-chart' },
    { key: 'kiosk', img: featureKiosk, icon: Monitor, route: '/kiosk-live-view' },
    { key: 'djmc', img: featureDjmc, icon: Mic, route: '/dj-mc-questionnaire' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <SeoHead
        title="All Products | Wedding Waitress"
        description="Explore all 13 Wedding Waitress products: guest list manager, QR code seating chart, invitations, name place cards, dietary requirements, kiosk live view, DJ-MC questionnaire and more."
        canonicalPath="/products"
      />
      <Header />
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            Wedding Waitress Products
          </h1>
          <p className="text-lg text-gray-500 text-center mb-16 max-w-2xl mx-auto">
            {t('featureCards.sectionSubtitle')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {productCards.map((card, cardIdx) => (
              <Link
                to={card.route}
                key={card.key}
                aria-label={`${t(`featureCards.${card.key}.title`)} – Learn more`}
                className="group relative rounded-3xl overflow-hidden h-80 cursor-pointer block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-transform duration-300 hover:scale-[1.03]"
              >
                <img src={card.img} alt={featureCardAlts[card.key] || t(`featureCards.${card.key}.title`)} loading={cardIdx < 3 ? 'eager' : 'lazy'} decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent transition-opacity duration-300 group-hover:from-black/80 group-hover:via-black/40" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10 backdrop-blur-[2px]" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <card.icon className="w-5 h-5 text-white/80" />
                    <h2 className="text-xl font-semibold text-white">{t(`featureCards.${card.key}.title`)}</h2>
                  </div>
                  <p className="text-white/70 text-sm">{t(`featureCards.${card.key}.desc`)}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm text-white/80 group-hover:text-white transition-colors">
                    {t('featureCardsLearnMore')}
                    <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
};
