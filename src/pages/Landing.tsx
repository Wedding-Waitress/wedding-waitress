import React, { useState } from 'react';
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Users, Calendar, MapPin, Mail, QrCode, Sparkles, ArrowRight, Check, Star, Instagram, Facebook, Linkedin, Youtube, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
export const Landing = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Password validation
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
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            mobile: formData.mobile
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Create profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          mobile: formData.mobile || null
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't show this error to user as the signup was successful
      }

      toast({
        title: "Account created successfully!",
        description: "Please check your email to verify your account, then you'll be redirected to your dashboard.",
      });

      // Navigate to dashboard - the auth will be handled there
      navigate('/dashboard');

    } catch (error) {
      console.error('Signup error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const features = [{
    icon: <Users className="w-6 h-6" />,
    title: "My Events",
    description: "Effortlessly manage your guest list with AI-powered seating optimization."
  }, {
    icon: <Calendar className="w-6 h-6" />,
    title: "Guest List",
    description: "Keep your wedding day perfectly orchestrated with intelligent scheduling."
  }, {
    icon: <MapPin className="w-6 h-6" />,
    title: "Table Setup",
    description: "Design and visualize your perfect wedding layout in 3D."
  }, {
    icon: <Mail className="w-6 h-6" />,
    title: "Floor Plan",
    description: "Beautiful, personalized invitations with real-time RSVP tracking."
  }, {
    icon: <QrCode className="w-6 h-6" />,
    title: "Online RSVP",
    description: "Seamless guest check-in process with contactless QR codes."
  }, {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Online Wishing Well",
    description: "Modern digital gift registry and money collection system."
  }, {
    icon: <Heart className="w-6 h-6" />,
    title: "Music Playlist",
    description: "Curate the perfect soundtrack for your special day with collaborative playlists."
  }, {
    icon: <QrCode className="w-6 h-6" />,
    title: "QR Code & Signage",
    description: "Create beautiful digital signage and QR codes for seamless guest experience."
  }];
  return <div className="min-h-screen" style={{
    background: `
      radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15), transparent 40%),
      radial-gradient(circle at 80% 70%, rgba(255,255,255,0.1), transparent 40%),
      linear-gradient(135deg, #5B2EFF 0%, #7A4DFF 30%, #9B6DFF 60%, #C6A9FF 100%)
    `
  }}>
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="w-full px-4 py-10 md:py-16 lg:py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full bg-white/15 border border-white/25 text-white text-sm font-medium px-4 md:px-8 lg:px-16 py-2">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Elegant Event Management
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
                  Your Dream Wedding,
                  <span className="gradient-text block">
                    Perfectly Orchestrated
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed my-[25px] text-center">First of it's kind worldwide. 
Streamline your wedding & event planning with our sophisticated guest management system. Create stunning event managed  arrangement, RSVPs invites and delight your guests with seamless table assignments.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 my-4 sm:my-6 md:my-8">
                <Button variant="hero" size="lg" className="btn-glow text-sm md:text-base w-full sm:w-auto touch-target">
                  Start Planning Today
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                </Button>
                <Button variant="outline" size="lg" className="glass w-full sm:w-auto touch-target">
                  Watch Demo
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 sm:gap-6 pt-4 sm:pt-6 md:pt-8">
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <span className="text-white/80 text-xs sm:text-sm md:text-base lg:text-lg text-center lg:text-left leading-relaxed">
                  5-Star rating from 2,000+ couples<br className="sm:hidden" />
                  Australian Made - Servicing Events Worldwide
                </span>
              </div>
            </div>

            {/* Sign Up Form */}
            <Card className="p-8 rounded-2xl" style={{
              backdropFilter: 'blur(10px)',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            }}>
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl gradient-text mx-0 px-0 py-0">Start Your Journey & Test Drive FREE !
              </CardTitle>
                <CardDescription className="text-base text-white/70">
                  Join thousands of couples & event planners<br />
                  who have created their perfect day.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {error}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} className="glass touch-target" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} className="glass touch-target" required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="glass touch-target" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input id="mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} className="glass touch-target" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password * (min 6 characters)</Label>
                    <Input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} className="glass touch-target" required />
                  </div>
                  
                  <Button type="submit" variant="gradient" size="lg" className="w-full btn-glow touch-target" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <Heart className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    By signing up, you agree to our <a href="/terms" className="text-primary hover:underline">Terms of Service</a> and <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="py-12 sm:py-16 md:py-20">
        <div className="w-full px-4">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white">
              How <span className="text-white/90">Wedding Waitress</span> Works
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-white/75 max-w-3xl mx-auto my-6 sm:my-12 md:my-[75px]">Our intelligent platform helps you save time, money & lots of stress. 
It handles every detail of your event's seating chart, RSVP & more so you can focus on what matters most - celebrating your special day.</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4 my-8 sm:my-12 md:my-[100px] text-white">
              Four Simple Steps To <span className="text-white/90">Create Your Perfect Wedding</span> Or Event Experience
            </h2>
          </div>

          {/* Four Steps Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12 md:mb-16">
            <Card className="group hover:shadow-purple-glow transition-all duration-300 rounded-2xl" style={{ backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <CardHeader className="text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2 text-white">Step 1: Sign Up Free</CardTitle>
                    <CardDescription className="text-base text-white/70">
                      Sign up & get started with your planning journey.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <Card className="group hover:shadow-purple-glow transition-all duration-300 rounded-2xl" style={{ backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <CardHeader className="text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2 text-white">Step 2: Create Your Free Account</CardTitle>
                    <CardDescription className="text-base text-white/70">
                      Add your guest list & test drive your RSVP's + seating charts then watch the magic happen.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <Card className="group hover:shadow-purple-glow transition-all duration-300 rounded-2xl" style={{ backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <CardHeader className="text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2 text-white">Step 3: Customise Everything</CardTitle>
                    <CardDescription className="text-base text-white/70">
                      Finalise everything, download – print your QR Code & signage design
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <Card className="group hover:shadow-purple-glow transition-all duration-300 rounded-2xl" style={{ backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <CardHeader className="text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2 text-white">Step 4: Download your QR Code</CardTitle>
                    <CardDescription className="text-base text-white/70">
                      Display at your event – Guests scan with mobile phone to find their table & seating
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Additional Heading */}
          <div className="text-center my-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white">
              Choose A Product or <span className="text-white/90">Create The Magic</span> & Choose Them All
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {features.map((feature, index) => <Card key={index} className="group hover:shadow-purple-glow transition-all duration-300 rounded-2xl" style={{ backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl text-left mb-2 text-white">{feature.title}</CardTitle>
                      <CardDescription className="text-base text-white/70">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <img src="/lovable-uploads/52bd6087-306b-46dd-af9b-463864f343a3.png" alt={`${feature.title} illustration`} className="w-full h-auto rounded-lg object-cover" />
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden">
        <div className="w-full px-4 text-center relative z-10">
          <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Ready to Plan Your Perfect Wedding?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-white/75">
              Join thousands of couples who trust Wedding Waitress to make their dream day a reality.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Button variant="hero" size="lg" className="btn-glow w-full sm:w-auto touch-target">
                Get Started for Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="glass w-full sm:w-auto touch-target">
                Book a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="relative">
        {/* CTA Footer Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="w-full px-4 text-center relative z-10">
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                Ready to Plan Smarter & Stress-Free?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-white/75">
                Join thousands of couples, planners, and venues already simplifying their seating charts and RSVPs.
              </p>
              <Button variant="hero" size="xl" className="btn-glow">
                Create Your Free Account
              </Button>
            </div>
          </div>
        </section>

        {/* Footer Links */}
        <div className="relative z-10" style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div className="w-full px-4 py-16">
            <div className="grid md:grid-cols-4 gap-8">
              {/* Wedding Waitress Column */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Heart className="w-6 h-6 text-white" />
                  <span className="font-bold text-xl text-white">Wedding Waitress</span>
                </div>
                <p className="text-white/60 text-sm">
                  Smart QR Seating Charts & RSVPs for weddings and events worldwide.
                </p>
              </div>

              {/* Explore Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Explore</h3>
                <ul className="space-y-2 text-sm text-white/60">
                  <li><a href="#" className="hover:text-white transition-colors">QR Code Seating Chart</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">QR Code RSVP</a></li>
                  <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Testimonials</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Trust</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                </ul>
              </div>

              {/* Support Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Support</h3>
                <ul className="space-y-2 text-sm text-white/60">
                  <li><Link to="/privacy" className="hover:text-white transition-colors cursor-pointer">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="hover:text-white transition-colors cursor-pointer">Terms of Service</Link></li>
                  <li><Link to="/contact" className="hover:text-white transition-colors cursor-pointer">Contact</Link></li>
                </ul>
              </div>

              {/* Payment Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Trusted & Secure Payment Gateway</h3>
                <div className="space-y-3">
                  <div className="bg-white/15 rounded-lg p-3 inline-block">
                    <span className="text-white font-bold text-lg">stripe</span>
                  </div>
                  <p className="text-xs text-white/50">
                    Secure checkout powered by Stripe. Data encrypted. Your credit card information is fully on Stripe & not on this platform.
                  </p>
                </div>
              </div>
            </div>

            {/* Social Media & Copyright */}
            <div className="mt-12 pt-8 flex flex-col md:flex-row justify-between items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <a href="#" className="text-white/50 hover:text-white transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-white/50 hover:text-white transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-white/50 hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="text-white/50 hover:text-white transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
              <p className="text-sm text-white/50">
                © 2025 Wedding Waitress. All rights reserved
              </p>
            </div>
          </div>
          
          {/* Simple Footer - Legal Links */}
          <div className="py-4 mt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-full px-4">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-white/40">
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <span>•</span>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
                <span>•</span>
                <span>© 2025 Wedding Waitress</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};