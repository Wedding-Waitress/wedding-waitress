import React, { useState } from 'react';
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/enhanced-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Users, Calendar, MapPin, Mail, QrCode, Sparkles, ArrowRight, Check, Star, Instagram, Facebook, Linkedin, Youtube } from "lucide-react";
export const Landing = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: ''
  });
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle sign up logic here
    console.log('Sign up:', formData);
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
  return <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium px-[100px] mx-[100px] my-[22px] py-[8px]">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Elegant Event Management
                </div>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  Your Dream Wedding,
                  <span className="gradient-text block">
                    Perfectly Orchestrated
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed my-[25px] text-center">First of it's kind worldwide. 
Streamline your wedding & event planning with our sophisticated guest management system. Create stunning event managed  arrangement, RSVPs invites and delight your guests with seamless table assignments.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 my-[50px] mx-[100px]">
                <Button variant="hero" size="xl" className="btn-glow text-base">
                  Start Planning Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button variant="outline" size="xl" className="glass">
                  Watch Demo
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center space-x-6 pt-8">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
                  <span className="text-muted-foreground ml-2 text-2xl text-center">5-Star rating from 2,000+ couples
Australian Made - Servicing Events Worldwide</span>
                </div>
              </div>
            </div>

            {/* Sign Up Form */}
            <Card variant="elevated" className="glass-purple p-8 shadow-purple-glow">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl gradient-text mx-0 px-0 py-0">Start Your Journey & Test Drive FREE !
              </CardTitle>
                <CardDescription className="text-base">
                  Join thousands of couples & event planners<br />
                  who have created their perfect day.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} className="glass" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} className="glass" required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="glass" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input id="mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleInputChange} className="glass" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} className="glass" required />
                  </div>
                  
                  <Button type="submit" variant="gradient" size="lg" className="w-full btn-glow">
                    Create Account
                    <Heart className="w-4 h-4 ml-2" />
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    By signing up, you agree to our terms and privacy policy
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              How <span className="gradient-text">Wedding Waitress</span> Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto my-[75px]">Our intelligent platform helps you save time, money & lots of stress. 
It handles every detail of your event's seating chart, RSVP & more so you can focus on what matters most - celebrating your special day.</p>
            <h2 className="text-4xl font-bold mb-4 my-[100px]">
              Four Simple Steps To <span className="gradient-text">Create Your Perfect Wedding</span> Or Event Experience
            </h2>
          </div>

          {/* Four Steps Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            <Card variant="elevated" className="group hover:shadow-purple-glow transition-all duration-300">
              <CardHeader className="text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Step 1: Sign Up Free</CardTitle>
                    <CardDescription className="text-base">
                      Sign up & get started with your planning journey.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <Card variant="elevated" className="group hover:shadow-purple-glow transition-all duration-300">
              <CardHeader className="text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Step 2: Create Your Free Account</CardTitle>
                    <CardDescription className="text-base">
                      Add your guest list & test drive your RSVP's + seating charts then watch the magic happen.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <Card variant="elevated" className="group hover:shadow-purple-glow transition-all duration-300">
              <CardHeader className="text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Step 3: Customise Everything</CardTitle>
                    <CardDescription className="text-base">
                      Finalise everything, download – print your QR Code & signage design
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            <Card variant="elevated" className="group hover:shadow-purple-glow transition-all duration-300">
              <CardHeader className="text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Step 4: Download your QR Code</CardTitle>
                    <CardDescription className="text-base">
                      Display at your event – Guests scan with mobile phone to find their table & seating
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Additional Heading */}
          <div className="text-center my-16">
            <h2 className="text-4xl font-bold mb-4">
              Choose A Product or <span className="gradient-text">Create The Magic</span> & Choose Them All
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => <Card key={index} variant="elevated" className="group hover:shadow-purple-glow transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl text-left mb-2">{feature.title}</CardTitle>
                      <CardDescription className="text-base">
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
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold">
              Ready to Plan Your Perfect Wedding?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of couples who trust Wedding Waitress to make their dream day a reality.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" className="btn-glow">
                Get Started for Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="outline" size="xl" className="glass">
                Book a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-background border-t">
        {/* CTA Footer Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-4xl mx-auto space-y-8">
              <h2 className="text-4xl font-bold">
                Ready to Plan Smarter & Stress-Free?
              </h2>
              <p className="text-xl text-muted-foreground">
                Join thousands of couples, planners, and venues already simplifying their seating charts and RSVPs.
              </p>
              <Button variant="hero" size="xl" className="btn-glow">
                Create Your Free Account
              </Button>
            </div>
          </div>
        </section>

        {/* Footer Links */}
        <div className="bg-card border-t">
          <div className="container mx-auto px-4 py-16">
            <div className="grid md:grid-cols-4 gap-8">
              {/* Wedding Waitress Column */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Heart className="w-6 h-6 text-primary" />
                  <span className="font-bold text-xl">Wedding Waitress</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Smart QR Seating Charts & RSVPs for weddings and events worldwide.
                </p>
              </div>

              {/* Explore Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Explore</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">QR Code Seating Chart</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">QR Code RSVP</a></li>
                  <li><a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Testimonials</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Trust</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
                </ul>
              </div>

              {/* Support Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Support</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                </ul>
              </div>

              {/* Payment Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Trusted & Secure Payment Gateway</h3>
                <div className="space-y-3">
                  <div className="bg-primary/10 rounded-lg p-3 inline-block">
                    <span className="text-primary font-bold text-lg">stripe</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Secure checkout powered by Stripe. Data encrypted. Your credit card information is fully on Stripe & not on this platform.
                  </p>
                </div>
              </div>
            </div>

            {/* Social Media & Copyright */}
            <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2025 Wedding Waitress. All rights reserved
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};