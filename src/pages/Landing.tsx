import React, { useState } from 'react';
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Heart, Users, Calendar, MapPin, Mail, QrCode, Sparkles, ArrowRight, Check, Star,
  Instagram, Facebook, Linkedin, Youtube, Loader2, Music, Layout, Clock, CreditCard,
  ChevronDown, Play, FileText, Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";

const glassCard = {
  backdropFilter: 'blur(10px)',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
};

const glassCardHover = {
  ...glassCard,
  boxShadow: '0 8px 32px rgba(91,46,255,0.15)',
};

export const Landing = () => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', mobile: '', password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { first_name: formData.firstName, last_name: formData.lastName, mobile: formData.mobile }
        }
      });
      if (signUpError) { setError(signUpError.message); return; }
      const { error: profileError } = await supabase.from('profiles').insert({
        first_name: formData.firstName, last_name: formData.lastName,
        email: formData.email, mobile: formData.mobile || null
      });
      if (profileError) console.error('Profile creation error:', profileError);
      toast({ title: "Account created successfully!", description: "Please check your email to verify your account, then you'll be redirected to your dashboard." });
      navigate('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const howItWorks = [
    { icon: <Calendar className="w-7 h-7" />, title: "Create Your Event", desc: "Set your wedding details in seconds — date, venue, and guest count." },
    { icon: <Users className="w-7 h-7" />, title: "Add Your Guests", desc: "Import or manually add your entire guest list with ease." },
    { icon: <MapPin className="w-7 h-7" />, title: "Organise Seating", desc: "Drag, drop & assign tables effortlessly with smart tools." },
    { icon: <Send className="w-7 h-7" />, title: "Share & Manage", desc: "Send invites, track RSVPs, and manage everything in one place." },
  ];

  const features = [
    {
      id: "guest-list",
      icon: <Users className="w-8 h-8" />,
      title: "Smart Guest List Management",
      desc: "Easily manage hundreds of guests, track RSVPs, assign relationships, and organise everything in one place.",
      bullets: ["RSVP tracking & reminders", "Family grouping", "Dietary requirements", "Import / export CSV"],
    },
    {
      id: "tables-seating",
      icon: <MapPin className="w-8 h-8" />,
      title: "Beautiful Table & Seating Planning",
      desc: "Create tables, assign guests, and visualise your entire seating plan with ease.",
      bullets: ["Drag & drop seating", "Table grouping & naming", "Smart capacity management"],
    },
    {
      id: "qr-seating",
      icon: <QrCode className="w-8 h-8" />,
      title: "Instant Guest Seating via QR Code",
      desc: "Let your guests scan a QR code to instantly find their table — no confusion, no stress.",
      bullets: ["Live guest lookup", "Mobile-friendly experience", "Modern & contactless"],
    },
    {
      id: "running-sheet",
      icon: <Clock className="w-8 h-8" />,
      title: "Plan Your Entire Wedding Timeline",
      desc: "Build your full event schedule, assign vendors, and share your running sheet with everyone involved.",
      bullets: ["Minute-by-minute timeline", "Vendor assignments", "Shareable with your team"],
    },
    {
      id: "dj-music",
      icon: <Music className="w-8 h-8" />,
      title: "DJ & Music Planning Made Easy",
      desc: "Organise songs for entrances, speeches, first dance and more — all in one place for your DJ or MC.",
      bullets: ["Song request management", "Entrance & exit music", "Share with DJ/MC directly"],
    },
    {
      id: "floor-plan",
      icon: <Layout className="w-8 h-8" />,
      title: "Visual Floor Plan Builder",
      desc: "Design your venue layout and ceremony seating arrangement visually for a perfect event flow.",
      bullets: ["Ceremony & reception layouts", "Drag & drop furniture", "Share with venue coordinators"],
    },
    {
      id: "invitations",
      icon: <Mail className="w-8 h-8" />,
      title: "Invitations, RSVP & Place Cards",
      desc: "Create, customise, send, and manage beautiful invitations. Generate personalised place cards for every guest.",
      bullets: ["Customisable invitation templates", "Digital RSVP management", "Printable place cards"],
    },
  ];

  const testimonials = [
    { quote: "This made our wedding planning so easy. The seating chart alone saved us hours of stress.", name: "Sarah & James", location: "Melbourne, AU" },
    { quote: "The QR code seating was incredible. Guests loved scanning to find their table instantly.", name: "Michael & Emma", location: "Sydney, AU" },
    { quote: "Finally a tool that understands weddings. Beautiful, intuitive, and our vendors loved it too.", name: "Priya & Arjun", location: "London, UK" },
  ];

  const faqs = [
    { q: "Can I import my guest list?", a: "Yes! You can import guests via CSV or add them manually one by one. We support bulk imports with all guest details including dietary requirements and contact information." },
    { q: "Can I share plans with my vendors?", a: "Absolutely. You can share your running sheet, floor plan, and DJ questionnaire with vendors via secure shareable links — no login required for them." },
    { q: "Is it mobile friendly?", a: "100%. Wedding Waitress is fully responsive. Your guests can scan QR codes and find their table on any phone, and you can manage everything from your mobile too." },
    { q: "Do guests need to download an app?", a: "No app needed! Guests simply scan a QR code with their phone camera and instantly see their table assignment in their browser." },
  ];

  return (
    <div className="min-h-screen" style={{
      background: `
        radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15), transparent 40%),
        radial-gradient(circle at 80% 70%, rgba(255,255,255,0.1), transparent 40%),
        linear-gradient(135deg, #5B2EFF 0%, #7A4DFF 30%, #9B6DFF 60%, #C6A9FF 100%)
      `
    }}>
      <Header />

      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Video background */}
        <div className="absolute inset-0 z-0">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover"
            poster="/lovable-uploads/52bd6087-306b-46dd-af9b-463864f343a3.png">
            <source src="https://videos.pexels.com/video-files/3337232/3337232-uhd_2560_1440_30fps.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0" style={{ background: 'rgba(91,46,255,0.55)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(91,46,255,0.4) 100%)' }} />
        </div>

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left */}
            <div className="space-y-8">
              <div className="inline-flex items-center rounded-full bg-white/15 border border-white/25 text-white text-sm font-medium px-5 py-2">
                <Sparkles className="w-4 h-4 mr-2" />
                Elegant Wedding Planning Platform
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] text-white tracking-tight">
                Plan Your Wedding.<br />
                <span className="text-white/90">Seat Every Guest Perfectly.</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/80 leading-relaxed max-w-xl">
                The all-in-one wedding planning system for guest lists, seating charts, invitations, and live event tools — designed to make your day seamless.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="lg" className="btn-glow touch-target text-base">
                  Start Planning Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button variant="outline" size="lg" className="glass touch-target text-base border-white/30 text-white hover:bg-white/10">
                  <Play className="w-4 h-4 mr-2" />
                  Watch How It Works
                </Button>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <span className="text-white/70 text-sm">Trusted by 2,000+ couples across Australia & beyond</span>
              </div>
            </div>

            {/* Right — Signup Card */}
            <Card className="p-6 sm:p-8 rounded-3xl" style={{ ...glassCard, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
              <CardHeader className="text-center pb-4 px-0">
                <CardTitle className="text-2xl font-bold text-white">Start Your Free Trial</CardTitle>
                <CardDescription className="text-white/60 text-base">Join thousands of couples planning their perfect day.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-white/80 text-sm">First Name *</Label>
                      <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} className="glass touch-target bg-white/10 border-white/20 text-white placeholder:text-white/40" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-white/80 text-sm">Last Name *</Label>
                      <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} className="glass touch-target bg-white/10 border-white/20 text-white placeholder:text-white/40" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-white/80 text-sm">Email *</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="glass touch-target bg-white/10 border-white/20 text-white placeholder:text-white/40" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mobile" className="text-white/80 text-sm">Mobile</Label>
                    <Input id="mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} className="glass touch-target bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-white/80 text-sm">Password * (min 6 characters)</Label>
                    <Input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} className="glass touch-target bg-white/10 border-white/20 text-white placeholder:text-white/40" required />
                  </div>
                  <Button type="submit" variant="gradient" size="lg" className="w-full btn-glow touch-target" disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Account...</> : <>Create Free Account<Heart className="w-4 h-4 ml-2" /></>}
                  </Button>
                  <p className="text-xs text-center text-white/50">
                    By signing up, you agree to our <Link to="/terms" className="underline hover:text-white/80">Terms</Link> and <Link to="/privacy" className="underline hover:text-white/80">Privacy Policy</Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">How Wedding Waitress Works</h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">Plan your entire wedding in minutes, not months.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, i) => (
              <Card key={i} className="group rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.03]" style={glassCard}>
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-white mx-auto mb-5 group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Step {i + 1}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{step.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FEATURE SECTIONS ═══════ */}
      {features.map((feat, i) => (
        <section key={feat.id} id={feat.id} className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              {/* Visual */}
              <div className="flex-1 w-full">
                <div className="rounded-3xl overflow-hidden" style={{ ...glassCard, padding: '2rem' }}>
                  <div className="w-full aspect-[4/3] rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))' }}>
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-white mx-auto">
                        {feat.icon}
                      </div>
                      <p className="text-white/40 text-sm font-medium">{feat.title}</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Text */}
              <div className="flex-1 space-y-6">
                <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">{feat.title}</h2>
                <p className="text-lg text-white/70 leading-relaxed">{feat.desc}</p>
                <ul className="space-y-3">
                  {feat.bullets.map((b, j) => (
                    <li key={j} className="flex items-center gap-3 text-white/80">
                      <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section id="testimonials" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Loved by Couples Everywhere</h2>
            <p className="text-lg text-white/70">See what real couples say about Wedding Waitress.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="rounded-2xl p-8" style={glassCard}>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-white/80 leading-relaxed mb-6 text-base italic">"{t.quote}"</p>
                <div>
                  <p className="text-white font-semibold">{t.name}</p>
                  <p className="text-white/50 text-sm">{t.location}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-white/70">No hidden fees. Start free, upgrade when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Standard */}
            <Card className="rounded-2xl p-8" style={glassCard}>
              <h3 className="text-xl font-bold text-white mb-1">Standard</h3>
              <p className="text-white/50 text-sm mb-6">Everything you need to get started</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$99</span>
                <span className="text-white/50 ml-1">AUD</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Guest management", "Tables & seating", "Basic QR code", "Place cards", "Email support"].map((item, j) => (
                  <li key={j} className="flex items-center gap-3 text-white/70 text-sm">
                    <Check className="w-4 h-4 text-white/50 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full glass border-white/20 text-white hover:bg-white/10">Get Started</Button>
            </Card>
            {/* Premium */}
            <Card className="rounded-2xl p-8 relative" style={{ ...glassCard, border: '2px solid rgba(139,92,246,0.6)', boxShadow: '0 0 40px rgba(139,92,246,0.15)' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full">Most Popular</div>
              <h3 className="text-xl font-bold text-white mb-1">Premium</h3>
              <p className="text-white/50 text-sm mb-6">Full power for your perfect wedding</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$149</span>
                <span className="text-white/50 ml-1">AUD</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Everything in Standard", "QR seating charts", "Invitations & RSVP", "Running sheet", "DJ/MC questionnaire", "Floor plan builder", "Priority support"].map((item, j) => (
                  <li key={j} className="flex items-center gap-3 text-white/70 text-sm">
                    <Check className="w-4 h-4 text-white flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button variant="gradient" className="w-full btn-glow">Get Premium</Button>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section id="faq" className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-white/70">Got questions? We've got answers.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Collapsible key={i} open={openFaq === i} onOpenChange={(open) => setOpenFaq(open ? i : null)}>
                <div className="rounded-2xl overflow-hidden" style={glassCard}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between p-5 text-left">
                    <span className="text-white font-medium text-base">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-white/60 transition-transform duration-200 flex-shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-5 pb-5 text-white/60 leading-relaxed text-sm">{faq.a}</div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.3), transparent 60%)' }} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">Plan Your Wedding the Smart Way</h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">Join thousands of couples creating stress-free, beautifully organised weddings.</p>
          <Button variant="hero" size="xl" className="btn-glow text-base">
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Heart className="w-6 h-6 text-white" />
                <span className="font-bold text-xl text-white">Wedding Waitress</span>
              </div>
              <p className="text-white/50 text-sm">Smart QR Seating Charts & RSVPs for weddings and events worldwide.</p>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Explore</h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#guest-list" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Support</h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Secure Payments</h3>
              <div className="bg-white/10 rounded-lg p-3 inline-block">
                <span className="text-white font-bold text-lg">stripe</span>
              </div>
              <p className="text-xs text-white/40">Secure checkout powered by Stripe. Your card data is fully encrypted.</p>
            </div>
          </div>
          <div className="mt-12 pt-8 flex flex-col md:flex-row justify-between items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <a href="#" className="text-white/40 hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="text-white/40 hover:text-white transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="text-white/40 hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
              <a href="#" className="text-white/40 hover:text-white transition-colors"><Youtube className="w-5 h-5" /></a>
            </div>
            <p className="text-sm text-white/40">© 2025 Wedding Waitress. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
