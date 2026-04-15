import React, { useRef } from 'react';
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/enhanced-button";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { ArrowRight, Users, MapPin, QrCode, Mail, Calendar, Layout, Music, UtensilsCrossed, CreditCard, Monitor, BarChart3, Star, Instagram, Facebook, Youtube, FileText, ClipboardList, Mic, Grid3X3, Heart, Check, Crown, Zap, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

import heroImg from "@/assets/hero-wedding.jpg";
import featureGuestlist from "@/assets/feature-guestlist.jpg";
import featureTables from "@/assets/feature-tables.jpg";
import featureQr from "@/assets/feature-qr.jpg";
import featureTimeline from "@/assets/feature-timeline.jpg";
import featureInvitations from "@/assets/feature-invitations.jpg";
import ctaImg from "@/assets/cta-wedding.jpg";
const ctaVideoUrl = "/__l5e/assets-v1/3df32a40-373d-4aa5-90c4-832d147e46a6/cta-wedding-ring.mp4";
import featureMyevents from "@/assets/feature-myevents.jpg";
import featurePlacecards from "@/assets/feature-placecards.jpg";
import featureTablecharts from "@/assets/feature-tablecharts.jpg";
import featureDietary from "@/assets/feature-dietary.jpg";
import featureSeatingchart from "@/assets/feature-seatingchart.jpg";
import featureKiosk from "@/assets/feature-kiosk.jpg";
import featureDjmc from "@/assets/feature-djmc.jpg";
import featureFloorplan from "@/assets/feature-floorplan.jpg";

const featureCards = [
  { title: "Guest List", desc: "Manage all your guests in one place", img: featureGuestlist, icon: Users },
  { title: "Tables & Seating", desc: "Organise tables and seating effortlessly", img: featureTables, icon: MapPin },
  { title: "QR Code Seating", desc: "Guests scan and find their table instantly", img: featureQr, icon: QrCode },
  { title: "Invitations", desc: "Send invites and track RSVPs", img: featureInvitations, icon: Mail },
  { title: "Running Sheet", desc: "Plan your full wedding timeline", img: featureTimeline, icon: Calendar },
  { title: "Floor Plan", desc: "Visualise your venue layout", img: featureFloorplan, icon: Layout },
  { title: "My Events", desc: "Manage all your events with ease", img: featureMyevents, icon: ClipboardList },
  { title: "Name Place Cards", desc: "Beautiful printed name cards", img: featurePlacecards, icon: CreditCard },
  { title: "Individual Table Charts", desc: "Per-table seating charts for each table", img: featureTablecharts, icon: Grid3X3 },
  { title: "Dietary Requirements", desc: "Track every guest's dietary needs", img: featureDietary, icon: UtensilsCrossed },
  { title: "Full Seating Chart", desc: "Complete print-ready seating chart", img: featureSeatingchart, icon: FileText },
  { title: "Kiosk Live View", desc: "Self-service guest check-in at venue", img: featureKiosk, icon: Monitor },
  { title: "DJ-MC Questionnaire", desc: "Share music and timing with your DJ", img: featureDjmc, icon: Mic },
];

const alternatingFeatures = [
  {
    id: "guest-list",
    title: "Guest List Management",
    desc: "Easily manage your entire guest list, track RSVPs, and organise relationships. Import guests, send invitations, and keep everything perfectly organised.",
    img: featureGuestlist,
  },
  {
    id: "tables-seating",
    title: "Seating Made Simple",
    desc: "Create tables and assign guests with ease using our visual drag-and-drop system. See capacity at a glance and make last-minute changes effortlessly.",
    img: featureTables,
  },
  {
    id: "qr-seating",
    title: "Instant Guest Seating",
    desc: "Guests scan a QR code to instantly find their table — no confusion, no delays. A modern, tech-forward touch your guests will love.",
    img: featureQr,
  },
  {
    id: "running-sheet",
    title: "Plan Every Moment",
    desc: "Create a full schedule for your wedding day and share with vendors. Keep everyone on the same page from ceremony to last dance.",
    img: featureTimeline,
  },
  {
    id: "invitations",
    title: "Invitations & RSVPs",
    desc: "Send beautiful digital invitations and track responses in real time. Customise designs, add QR codes, and manage RSVPs all in one place.",
    img: featureInvitations,
  },
  {
    id: "my-events",
    title: "Your Events, Your Way",
    desc: "Create and manage multiple events from a single dashboard. Track countdowns, set up venues, and keep every detail organised beautifully.",
    img: featureMyevents,
  },
  {
    id: "place-cards",
    title: "Elegant Name Place Cards",
    desc: "Design stunning printed name cards with custom fonts, colours, and backgrounds. Export in high-resolution 300 DPI for professional printing.",
    img: featurePlacecards,
  },
  {
    id: "table-charts",
    title: "Individual Table Charts",
    desc: "Generate beautiful per-table seating charts your guests can see at a glance. Perfect for printing and displaying at each table.",
    img: featureTablecharts,
  },
  {
    id: "dietary",
    title: "Dietary Requirements Made Easy",
    desc: "Track every guest's dietary needs and generate kitchen-ready charts. Ensure no guest is overlooked with detailed allergen and preference tracking.",
    img: featureDietary,
  },
  {
    id: "seating-chart",
    title: "Full Seating Chart",
    desc: "Create a complete, print-ready seating chart showing every guest and table. Export to PDF with custom styling and your event branding.",
    img: featureSeatingchart,
  },
  {
    id: "kiosk",
    title: "Kiosk Live View",
    desc: "Set up self-service check-in kiosks at your venue entrance. Guests search their name and instantly see their table assignment on screen.",
    img: featureKiosk,
  },
  {
    id: "dj-mc",
    title: "DJ & MC Questionnaire",
    desc: "Share your music preferences, pronunciation guides, and event timeline directly with your DJ or MC. Keep everyone aligned for the perfect celebration.",
    img: featureDjmc,
  },
  {
    id: "floor-plan",
    title: "Venue Floor Plan",
    desc: "Visualise your entire venue layout with an interactive floor plan. Position tables, map the ceremony space, and plan every area of your event.",
    img: featureFloorplan,
  },
];

const extraFeatures = [
  { icon: Music, title: "DJ & MC Planner", desc: "Curate your perfect playlist" },
  { icon: UtensilsCrossed, title: "Dietary Requirements", desc: "Track every guest's needs" },
  { icon: CreditCard, title: "Place Cards", desc: "Beautiful printed name cards" },
  { icon: Monitor, title: "Live Kiosk View", desc: "Self-service guest check-in" },
  { icon: BarChart3, title: "Seating Charts", desc: "Print-ready table layouts" },
  { icon: ClipboardList, title: "My Events", desc: "Manage all your events" },
  { icon: MapPin, title: "Tables Setup", desc: "Create and organise tables" },
  { icon: Users, title: "Guest List", desc: "Full guest management" },
  { icon: QrCode, title: "QR Code Seating", desc: "Scan to find your table" },
  { icon: Mail, title: "Invitations & Cards", desc: "Send and track invites" },
  { icon: Grid3X3, title: "Individual Table Charts", desc: "Per-table guest display" },
  { icon: Layout, title: "Floor Plan", desc: "Visualise your venue layout" },
  { icon: FileText, title: "Full Seating Chart", desc: "Complete seating overview" },
  { icon: Calendar, title: "Running Sheet", desc: "Plan your full timeline" },
];

const testimonials = [
  { name: "Sarah & James", text: "This made our wedding planning so easy. We managed 200 guests without any stress!", rating: 5 },
  { name: "Emily & Tom", text: "The QR seating was amazing — our guests loved scanning to find their table instantly.", rating: 5 },
  { name: "Jessica & Michael", text: "Everything was organised perfectly. The running sheet kept all our vendors on track.", rating: 5 },
  { name: "Olivia & Daniel", text: "We saved so many hours with the guest list management. Absolute game changer!", rating: 5 },
  { name: "Sophie & Chris", text: "The place cards and seating charts looked incredibly professional. Worth every cent.", rating: 5 },
  { name: "Mia & Liam", text: "Our coordinator was impressed with how organised everything was. Thank you Wedding Waitress!", rating: 5 },
];

export const Landing = () => {
  const signUpRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Luxury wedding reception" width={1920} height={1080} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
            Plan Your Wedding<br />
            <span className="text-white/90">Without the Stress.</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Everything you need to manage guests, seating, invitations and your entire wedding — all in one place.
          </p>
          <SignUpModal>
            <Button ref={signUpRef} size="lg" className="bg-white text-gray-900 hover:bg-white/90 rounded-2xl px-10 py-6 text-lg font-semibold shadow-[0_4px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </SignUpModal>
          <p className="text-white/60 text-sm mt-6">Trusted by couples across Australia</p>
        </div>
      </section>

      {/* Feature Cards Row */}
      <section className="py-24 md:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            The wedding platform your guests will love.
          </h2>
          <p className="text-lg text-gray-500 text-center mb-16 max-w-2xl mx-auto">
            Every tool you need, beautifully designed and simple to use.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((card) => (
              <div key={card.title} className="group relative rounded-3xl overflow-hidden h-80 cursor-pointer">
                <img src={card.img} alt={card.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10 backdrop-blur-[2px]" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <card.icon className="w-5 h-5 text-white/80" />
                    <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                  </div>
                  <p className="text-white/70 text-sm">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alternating Feature Sections */}
      {alternatingFeatures.map((feature, idx) => (
        <section key={feature.id} id={feature.id} className="py-20 md:py-28 px-4">
          <div className={`max-w-7xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center ${idx % 2 === 1 ? 'md:[direction:rtl]' : ''}`}>
            <div className={`${idx % 2 === 1 ? 'md:[direction:ltr]' : ''}`}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {feature.title}
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed mb-8">
                {feature.desc}
              </p>
              <SignUpModal>
                <Button variant="outline" className="rounded-2xl px-8 py-5 text-base font-medium border-gray-300 hover:border-primary hover:text-primary transition-all">
                  Learn More
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </SignUpModal>
            </div>
            <div className={`rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.1)] ${idx % 2 === 1 ? 'md:[direction:ltr]' : ''}`}>
              <img src={feature.img} alt={feature.title} loading="lazy" width={1280} height={960} className="w-full h-auto object-cover" />
            </div>
          </div>
        </section>
      ))}

      {/* Extra Feature Grid */}
      <section className="py-24 md:py-32 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-16">
            Everything you need for your perfect day
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {extraFeatures.map((f) => (
              <div key={f.title} className="bg-[#FAFAFA] rounded-3xl p-6 text-center hover:shadow-[0_4px_30px_rgba(0,0,0,0.08)] transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            Your friends will be impressed.
          </h2>
          <p className="text-lg text-gray-500 text-center mb-16 max-w-xl mx-auto">
            See what couples are saying about Wedding Waitress.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_30px_rgba(0,0,0,0.08)] transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-4">"{t.text}"</p>
                <p className="text-sm font-semibold text-gray-900">{t.name}</p>
              </div>
            ))}
          </div>
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
            All the magic.<br />None of the stress.
          </h2>
          <p className="text-white/70 text-lg md:text-xl mb-12">Start planning your perfect day — it's free.</p>
          <SignUpModal>
            <Button size="lg" className="bg-white text-gray-900 hover:bg-white/90 rounded-2xl px-10 py-6 text-lg font-semibold shadow-[0_4px_30px_rgba(0,0,0,0.15)] transition-all hover:scale-105">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </SignUpModal>
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
                The all-in-one wedding planning platform trusted by couples across Australia.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">Explore</h4>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li><a href="#guest-list" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">Support</h4>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                  <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                  <li><Link to="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                </ul>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">Follow Us</h4>
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
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Wedding Waitress. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
