import React, { useRef, useState } from 'react';
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/enhanced-button";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { ArrowRight, Users, MapPin, QrCode, Mail, Calendar, Layout, Music, UtensilsCrossed, CreditCard, Monitor, BarChart3, Star, Instagram, Facebook, Youtube, FileText, ClipboardList, Mic, Grid3X3, Heart, Check, Crown, Zap, Building2, Send, ChevronDown, MessageSquare, CalendarPlus, UserPlus, Palette, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { CookieBanner } from "@/components/ui/CookieBanner";
import { useTranslation } from 'react-i18next';

import heroImg from "@/assets/hero-wedding.jpg";
import featureGuestlist from "@/assets/feature-guestlist.jpg";
import featureTables from "@/assets/feature-tables.jpg";
import featureQr from "@/assets/feature-qr.jpg";
import featureTimeline from "@/assets/feature-timeline.jpg";
import featureInvitations from "@/assets/feature-invitations.jpg";
import ctaImg from "@/assets/cta-wedding.jpg";
const ctaVideoUrl = "/__l5e/assets-v1/3df32a40-373d-4aa5-90c4-832d147e46a6/cta-wedding-ring.mp4";
import heroCombinedVideo from "@/assets/hero-combined.mp4";
import featureMyevents from "@/assets/feature-myevents.jpg";
import featurePlacecards from "@/assets/feature-placecards.jpg";
import featureTablecharts from "@/assets/feature-tablecharts.jpg";
import featureDietary from "@/assets/feature-dietary.jpg";
import featureSeatingchart from "@/assets/feature-seatingchart.jpg";
import featureKiosk from "@/assets/feature-kiosk.jpg";
import featureDjmc from "@/assets/feature-djmc.jpg";
import featureFloorplan from "@/assets/feature-floorplan.jpg";

export const Landing = () => {
  const { t } = useTranslation('landing');
  const signUpRef = useRef<HTMLButtonElement>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const featureCardAlts: Record<string, string> = {
    guestList: "Wedding guest list manager with RSVP tracking",
    tables: "Wedding table seating arrangement planner",
    qr: "QR code wedding seating chart scanner",
    invitations: "Digital wedding invitations with online RSVP",
    runningSheet: "Wedding day timeline and event schedule",
    floorPlan: "Wedding venue floor plan layout designer",
    myEvents: "Wedding event management dashboard",
    placeCards: "Printed wedding name place cards",
    tableCharts: "Individual wedding table seating charts",
    dietary: "Wedding guest dietary requirements tracker",
    seatingChart: "Full wedding seating chart overview",
    kiosk: "Wedding venue self-service check-in kiosk",
    djmc: "Wedding DJ and MC music questionnaire",
  };

  const featureCards = [
    { key: "guestList", img: featureGuestlist, icon: Users },
    { key: "tables", img: featureTables, icon: MapPin },
    { key: "qr", img: featureQr, icon: QrCode },
    { key: "invitations", img: featureInvitations, icon: Mail },
    { key: "runningSheet", img: featureTimeline, icon: Calendar },
    { key: "floorPlan", img: featureFloorplan, icon: Layout },
    { key: "myEvents", img: featureMyevents, icon: ClipboardList },
    { key: "placeCards", img: featurePlacecards, icon: CreditCard },
    { key: "tableCharts", img: featureTablecharts, icon: Grid3X3 },
    { key: "dietary", img: featureDietary, icon: UtensilsCrossed },
    { key: "seatingChart", img: featureSeatingchart, icon: FileText },
    { key: "kiosk", img: featureKiosk, icon: Monitor },
    { key: "djmc", img: featureDjmc, icon: Mic },
  ];

  const featureRoutes: Record<string, string> = {
    guestList: '/features/guest-list',
    tables: '/features/seating',
    qr: '/features/qr-seating',
    runningSheet: '/features/planning',
    invitations: '/features/invitations',
    myEvents: '/features/events',
    placeCards: '/features/place-cards',
    tableCharts: '/features/table-charts',
    dietary: '/features/dietary',
    seatingChart: '/features/full-seating',
    kiosk: '/features/kiosk',
    djmc: '/features/dj-mc',
    floorPlan: '/features/floor-plan',
  };

  const alternatingFeatures = [
    { id: "guest-list", key: "guestList", img: featureGuestlist },
    { id: "tables-seating", key: "tables", img: featureTables },
    { id: "qr-seating", key: "qr", img: featureQr },
    { id: "running-sheet", key: "runningSheet", img: featureTimeline },
    { id: "invitations", key: "invitations", img: featureInvitations },
    { id: "my-events", key: "myEvents", img: featureMyevents },
    { id: "place-cards", key: "placeCards", img: featurePlacecards },
    { id: "table-charts", key: "tableCharts", img: featureTablecharts },
    { id: "dietary", key: "dietary", img: featureDietary },
    { id: "seating-chart", key: "seatingChart", img: featureSeatingchart },
    { id: "kiosk", key: "kiosk", img: featureKiosk },
    { id: "dj-mc", key: "djmc", img: featureDjmc },
    { id: "floor-plan", key: "floorPlan", img: featureFloorplan },
  ];

  const extraFeatureKeys = [
    { icon: Music, key: "djmc" },
    { icon: UtensilsCrossed, key: "dietary" },
    { icon: CreditCard, key: "placeCards" },
    { icon: Monitor, key: "kiosk" },
    { icon: BarChart3, key: "seatingCharts" },
    { icon: ClipboardList, key: "myEvents" },
    { icon: MapPin, key: "tables" },
    { icon: Users, key: "guestList" },
    { icon: QrCode, key: "qr" },
    { icon: Mail, key: "invitations" },
    { icon: Grid3X3, key: "tableCharts" },
    { icon: Layout, key: "floorPlan" },
    { icon: FileText, key: "fullSeatingChart" },
    { icon: Calendar, key: "runningSheet" },
  ];

  const testimonialItems = t('testimonials.items', { returnObjects: true }) as Array<{ name: string; text: string }>;
  const faqItems = t('faq.items', { returnObjects: true }) as Array<{ q: string; a: string }>;

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) return;
    setContactSending(true);
    setTimeout(() => {
      setContactSending(false);
      setContactSent(true);
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => setContactSent(false), 4000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={heroImg}
            className="w-full h-full object-cover hidden md:block"
          >
            <source src={heroCombinedVideo} type="video/mp4" />
          </video>
          <img src={heroImg} alt="Wedding reception with elegant table settings and seating chart" width={1920} height={1080} className="w-full h-full object-cover md:hidden" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-4">
            Plan Your Wedding Day<br />
            <span className="text-white/90">Without the Stress</span>
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-white/90 mb-4">
            Guest List, Seating Charts & QR Code RSVPs — All in One Place
          </p>
          <p className="text-base sm:text-lg text-white font-medium mb-8 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            Trusted by couples across Australia & around the world
          </p>
          <div className="flex justify-center">
            <SignUpModal>
              <Button ref={signUpRef} size="lg" className="bg-white text-gray-900 hover:bg-white/90 rounded-2xl px-10 py-6 text-lg font-semibold shadow-[0_4px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105">
                {t('hero.cta')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </SignUpModal>
          </div>
        </div>
      </section>

      {/* Feature Cards Row */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            {t('featureCards.sectionTitle')}
          </h2>
          <p className="text-lg text-gray-500 text-center mb-16 max-w-2xl mx-auto">
            {t('featureCards.sectionSubtitle')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((card) => (
              <div key={card.key} className="group relative rounded-3xl overflow-hidden h-80 cursor-pointer">
                <img src={card.img} alt={featureCardAlts[card.key] || t(`featureCards.${card.key}.title`)} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10 backdrop-blur-[2px]" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <card.icon className="w-5 h-5 text-white/80" />
                    <h3 className="text-xl font-semibold text-white">{t(`featureCards.${card.key}.title`)}</h3>
                  </div>
                  <p className="text-white/70 text-sm">{t(`featureCards.${card.key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 md:py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            {t('howItWorks.title')}
          </h2>
          <p className="text-lg text-gray-500 text-center mb-16 max-w-4xl mx-auto whitespace-nowrap">
            {t('howItWorks.subtitle')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: CalendarPlus, step: '1', titleKey: 'step1Title', descKey: 'step1Desc' },
              { icon: UserPlus, step: '2', titleKey: 'step2Title', descKey: 'step2Desc' },
              { icon: Palette, step: '3', titleKey: 'step3Title', descKey: 'step3Desc' },
              { icon: Share2, step: '4', titleKey: 'step4Title', descKey: 'step4Desc' },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: 'rgba(150, 122, 89, 0.1)' }}>
                  <item.icon className="w-8 h-8" style={{ color: '#967A59' }} />
                </div>
                <div className="text-sm font-bold mb-2" style={{ color: '#967A59' }}>Step {item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t(`howItWorks.${item.titleKey}`)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{t(`howItWorks.${item.descKey}`)}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm mt-12" style={{ color: '#967A59' }}>{t('howItWorks.bottomNote')}</p>
        </div>
      </section>

      {/* Alternating Feature Sections */}
      {alternatingFeatures.map((feature, idx) => (
        <section key={feature.id} id={feature.id} className="py-10 md:py-14 px-4">
          <div className={`max-w-7xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center ${idx % 2 === 1 ? 'md:[direction:rtl]' : ''}`}>
            <div className={`${idx % 2 === 1 ? 'md:[direction:ltr]' : ''}`}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {t(`alternating.${feature.key}.title`)}
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed mb-8">
                {t(`alternating.${feature.key}.desc`)}
              </p>
              <Link to={featureRoutes[feature.key] || '/'}>
                <Button variant="outline" className="rounded-2xl px-8 py-5 text-base font-medium border-gray-300 hover:border-primary hover:text-primary transition-all">
                  {t('alternating.learnMore')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className={`rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.1)] ${idx % 2 === 1 ? 'md:[direction:ltr]' : ''}`}>
              <img src={feature.img} alt={featureCardAlts[feature.key] || t(`alternating.${feature.key}.title`)} loading="lazy" width={1280} height={960} className="w-full h-auto object-cover" />
            </div>
          </div>
        </section>
      ))}

      {/* Extra Feature Grid */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            {t('extraGrid.title')}
          </h2>
          <p className="text-lg text-gray-500 text-center mb-16 max-w-3xl mx-auto">
            {t('extraGrid.subtitle')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {extraFeatureKeys.map((f) => (
              <div key={f.key} className="bg-[#FAFAFA] rounded-3xl p-6 text-center hover:shadow-[0_4px_30px_rgba(0,0,0,0.08)] transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{t(`extraGrid.${f.key}.title`)}</h3>
                <p className="text-gray-500 text-sm">{t(`extraGrid.${f.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-lg text-gray-500 text-center mb-4 max-w-xl mx-auto">
            {t('pricing.subtitle')}
          </p>
          <p className="text-base font-medium text-primary text-center mb-4 max-w-2xl mx-auto">
            {t('pricing.trialNote')}
          </p>
          <p className="text-sm text-gray-500 text-center mb-2 max-w-xl mx-auto">
            {t('pricing.reassurance')}
          </p>
          <p className="text-sm text-gray-400 text-center mb-16 max-w-xl mx-auto">
            {t('pricing.noHiddenFees')}
          </p>

          {/* Main Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {/* Essential */}
            <div className="bg-white rounded-[20px] p-8 shadow-[0_4px_30px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold text-gray-900">{t('pricing.essential.name')}</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-gray-900">$99</span>
                <span className="text-gray-400 line-through text-lg">$199</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">{t('pricing.essential.guests')}</p>
              <p className="text-xs text-primary/70 mb-6">{t('pricing.saveLine')}</p>
              <ul className="space-y-3 mb-8">
                {[t('pricing.features.oneEvent'), t('pricing.features.fullAccess'), t('pricing.features.easySetup')].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <SignUpModal>
                <Button variant="outline" className="w-full rounded-xl">{t('pricing.getStarted')}</Button>
              </SignUpModal>
              <p className="text-xs text-gray-400 text-center mt-2">{t('pricing.trialUnderButton')}</p>
              <p className="text-[10px] text-gray-400 text-center mt-1">{t('pricing.cardTrust')}</p>
            </div>

            {/* Premium — highlighted */}
            <div className="bg-white rounded-[20px] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)] border-2 border-primary lg:scale-105 relative hover:-translate-y-2 hover:shadow-[0_12px_50px_rgba(0,0,0,0.15)] transition-all duration-300">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md">{t('pricing.mostPopular')}</span>
              </div>
              <p className="text-xs text-primary/70 text-center mt-2">{t('pricing.bestForMost')}</p>
              <div className="flex items-center gap-2 mb-4 mt-1">
                <Crown className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold text-gray-900">{t('pricing.premium.name')}</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-gray-900">$149</span>
                <span className="text-gray-400 line-through text-lg">$299</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">{t('pricing.premium.guests')}</p>
              <p className="text-xs text-primary/70 mb-6">{t('pricing.saveLine')}</p>
              <ul className="space-y-3 mb-8">
                {[t('pricing.features.oneEvent'), t('pricing.features.fullAccess'), t('pricing.features.easySetup')].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <SignUpModal>
                <Button className="w-full rounded-xl bg-primary text-white hover:bg-primary/90">{t('pricing.getStarted')}</Button>
              </SignUpModal>
              <p className="text-xs text-gray-400 text-center mt-2">{t('pricing.trialUnderButton')}</p>
              <p className="text-[10px] text-gray-400 text-center mt-1">{t('pricing.cardTrust')}</p>
            </div>

            {/* Unlimited */}
            <div className="bg-white rounded-[20px] p-8 shadow-[0_4px_30px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold text-gray-900">{t('pricing.unlimited.name')}</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-gray-900">$249</span>
                <span className="text-gray-400 line-through text-lg">$499</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">{t('pricing.unlimited.guests')}</p>
              <p className="text-xs text-primary/70 mb-6">{t('pricing.saveLine')}</p>
              <ul className="space-y-3 mb-8">
                {[t('pricing.features.oneEvent'), t('pricing.features.fullAccess'), t('pricing.features.easySetup')].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <SignUpModal>
                <Button variant="outline" className="w-full rounded-xl">{t('pricing.getStarted')}</Button>
              </SignUpModal>
              <p className="text-xs text-gray-400 text-center mt-2">{t('pricing.trialUnderButton')}</p>
              <p className="text-[10px] text-gray-400 text-center mt-1">{t('pricing.cardTrust')}</p>
            </div>

            {/* Vendor Pro */}
            <div className="bg-gray-900 text-white rounded-[20px] p-8 shadow-[0_4px_30px_rgba(0,0,0,0.2)] hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-300 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-white text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-full shadow-md">{t('pricing.forVenuesAndPros')}</span>
              </div>
              <div className="flex items-center gap-2 mb-4 mt-2">
                <Building2 className="w-5 h-5 text-[#C4A882]" />
                <h3 className="text-xl font-bold">{t('pricing.vendorPro.name')}</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold">$249</span>
                <span className="text-gray-400 text-lg">/month</span>
              </div>
              <p className="text-sm text-gray-400 mb-6">{t('pricing.vendorPro.guests')}</p>
              <ul className="space-y-2 mb-8">
                {[t('pricing.features.unlimitedEvents'), t('pricing.features.unlimitedGuests'), t('pricing.features.fullPlatform'), t('pricing.features.forVenues'), t('pricing.features.weddingPlanners'), t('pricing.features.djMcPros')].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                    <Check className="w-4 h-4 text-[#C4A882] mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <SignUpModal>
                <Button className="w-full rounded-xl bg-primary text-white hover:bg-primary/90">{t('pricing.getStarted')}</Button>
              </SignUpModal>
              <p className="text-xs text-gray-500 text-center mt-3">{t('pricing.approvalRequired')}</p>
            </div>
          </div>
          <div className="text-center mt-12">
            <p className="text-base font-medium text-gray-700">{t('pricing.riskReversal1')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('pricing.riskReversal2')}</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-primary font-medium text-center mb-4">{t('testimonials.intro')}</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            {t('testimonials.title')}
          </h2>
          <p className="text-lg text-gray-500 text-center mb-16 max-w-xl mx-auto">
            {t('testimonials.subtitle')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(testimonialItems) && testimonialItems.map((item, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_30px_rgba(0,0,0,0.08)] transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-4">"{item.text}"</p>
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 md:py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            {t('faq.title')}
          </h2>
          <p className="text-lg text-gray-500 text-center mb-16 max-w-xl mx-auto">
            {t('faq.subtitle')}
          </p>
          <div className="space-y-4">
            {Array.isArray(faqItems) && faqItems.map((item, i) => (
              <div
                key={i}
                className="bg-[#FAFAFA] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="text-base font-semibold text-gray-900 pr-4">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 pb-6' : 'max-h-0'}`}>
                  <p className="px-6 text-sm text-gray-500 leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 md:py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            {t('contact.title')}
          </h2>
          <p className="text-lg text-gray-500 text-center mb-16 max-w-xl mx-auto">
            {t('contact.subtitle')}
          </p>
          <form onSubmit={handleContactSubmit} className="bg-white rounded-[20px] p-8 md:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.08)]">
            <div className="space-y-5">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1.5">{t('contact.name')}</label>
                <input
                  id="contact-name"
                  type="text"
                  maxLength={100}
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FAFAFA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder={t('contact.namePlaceholder')}
                  required
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1.5">{t('contact.email')}</label>
                <input
                  id="contact-email"
                  type="email"
                  maxLength={255}
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FAFAFA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder={t('contact.emailPlaceholder')}
                  required
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1.5">{t('contact.message')}</label>
                <textarea
                  id="contact-message"
                  maxLength={1000}
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FAFAFA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                  placeholder={t('contact.messagePlaceholder')}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={contactSending}
                className="w-full rounded-xl bg-primary text-white hover:bg-primary/90 py-3"
              >
                {contactSending ? t('contact.sending') : contactSent ? t('contact.sent') : (
                  <>
                    {t('contact.sendButton')}
                    <Send className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative min-h-[80vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover scale-105 animate-[ctaZoom_20s_ease-in-out_infinite_alternate]"
            poster={ctaImg}
          >
            <source src={ctaVideoUrl} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-black/50" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-[ctaFadeIn_1.5s_ease-out_both]">
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {t('finalCta.title1')}<br />{t('finalCta.title2')}
          </h2>
          <p className="text-white/70 text-lg md:text-xl mb-12">{t('finalCta.subtitle')}</p>
          <SignUpModal>
            <Button size="lg" className="bg-white text-gray-900 hover:bg-white/90 rounded-2xl px-10 py-6 text-lg font-semibold shadow-[0_4px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105">
              {t('finalCta.cta')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </SignUpModal>
          <p className="text-sm text-white/60 mt-4">{t('finalCta.ctaSub')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/wedding-waitress-logo-full.png" alt="Wedding Waitress" className="h-10 w-auto brightness-0 invert" />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                {t('footer.tagline')}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{t('footer.explore')}</h4>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li><a href="#guest-list" className="hover:text-white transition-colors">{t('footer.features')}</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">{t('footer.pricing')}</a></li>
                  <li><a href="#faq" className="hover:text-white transition-colors">{t('footer.faq')}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{t('footer.support')}</h4>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li><Link to="/contact" className="hover:text-white transition-colors">{t('footer.contactUs')}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{t('footer.legal')}</h4>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li><Link to="/privacy" className="hover:text-white transition-colors">{t('footer.privacy')}</Link></li>
                  <li><Link to="/terms" className="hover:text-white transition-colors">{t('footer.terms')}</Link></li>
                  <li><Link to="/cookies" className="hover:text-white transition-colors">{t('footer.cookiePolicy')}</Link></li>
                </ul>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{t('footer.followUs')}</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex items-center justify-center">
            <p className="text-gray-500 text-sm">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
      <CookieBanner />
    </div>
  );
};
