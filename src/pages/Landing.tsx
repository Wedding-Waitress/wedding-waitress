import React, { useState } from 'react';
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/enhanced-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Heart, 
  Users, 
  Calendar, 
  MapPin, 
  Mail, 
  QrCode,
  Sparkles,
  ArrowRight,
  Check,
  Star
} from "lucide-react";

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

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Smart Guest Management",
      description: "Effortlessly manage your guest list with AI-powered seating optimization."
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Event Timeline",
      description: "Keep your wedding day perfectly orchestrated with intelligent scheduling."
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Interactive Floor Plans",
      description: "Design and visualize your perfect wedding layout in 3D."
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Digital RSVP System",
      description: "Beautiful, personalized invitations with real-time RSVP tracking."
    },
    {
      icon: <QrCode className="w-6 h-6" />,
      title: "QR Code Check-ins",
      description: "Seamless guest check-in process with contactless QR codes."
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Wishing Well",
      description: "Modern digital gift registry and money collection system."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Futuristic Wedding Management 2026
                </div>
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  Your Dream Wedding,
                  <span className="gradient-text block">
                    Perfectly Orchestrated
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Transform your special day with AI-powered wedding management. 
                  From guest lists to seating charts, make every moment magical 
                  with Wedding Waitress.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="hero" size="xl" className="btn-glow">
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
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">5.0 from 2,000+ couples</span>
                </div>
              </div>
            </div>

            {/* Sign Up Form */}
            <Card variant="elevated" className="glass-purple p-8 shadow-purple-glow">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl gradient-text">
                  Start Your Journey
                </CardTitle>
                <CardDescription className="text-base">
                  Join thousands of couples planning their perfect day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="glass"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="glass"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="glass"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      className="glass"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="glass"
                      required
                    />
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
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our intelligent platform handles every detail of your wedding planning, 
              so you can focus on what matters most - celebrating your love.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} variant="elevated" className="group hover:shadow-purple-glow transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
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
    </div>
  );
};