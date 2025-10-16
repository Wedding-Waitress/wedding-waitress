import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, Camera, Mic, DollarSign, MapPin, Printer, Monitor, Shield,
  Heart, CheckCircle, Star, ArrowRight, Play
} from 'lucide-react';
import { SignInModal } from '@/components/auth/SignInModal';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const PRIMARY_COLOR = '#6D28D9';

export default function Index() {
  const [showSignIn, setShowSignIn] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
    });
  }, [navigate]);

  const handleSignUp = () => {
    navigate('/dashboard');
  };

  const features = [
    {
      icon: QrCode,
      title: 'QR-Code Seating Chart & RSVP',
      description: 'Guests scan, confirm attendance, auto-syncs to Guest List. No app downloads required.',
      link: '#qr-seating',
    },
    {
      icon: Camera,
      title: 'Photo & Video Sharing (Kululu-style)',
      description: 'Guests upload from their phone; live album updates instantly.',
      link: '#photo-sharing',
    },
    {
      icon: Mic,
      title: 'Audio Guestbook',
      description: 'Record voice messages with one tap; auto-saves to your album.',
      link: '#audio',
    },
    {
      icon: DollarSign,
      title: 'Online Wishing Well',
      description: 'Secure cash gifts with payout tracking.',
      link: '#wishing-well',
    },
    {
      icon: MapPin,
      title: 'Tables & Floor Plans',
      description: 'Drag-and-drop seating with live sync & print views.',
      link: '#floor-plans',
    },
    {
      icon: Printer,
      title: 'Printables',
      description: 'A4 place cards, dietary sheets, seating charts; pixel-perfect to printer.',
      link: '#printables',
    },
    {
      icon: Monitor,
      title: 'Kiosk Mode',
      description: 'Full-screen slideshow or upload station at your event.',
      link: '#kiosk',
    },
    {
      icon: Shield,
      title: 'Admin Controls',
      description: 'Private analytics, moderations, logs (for admins only).',
      link: '#admin',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah & James',
      role: 'Melbourne Wedding',
      text: 'The QR code seating was a game-changer! Our guests found their tables instantly.',
      rating: 5,
    },
    {
      name: 'DJ Marcus',
      role: 'Event Professional',
      text: 'I recommend Wedding Waitress to all my clients. The photo sharing is brilliant.',
      rating: 5,
    },
    {
      name: 'Emma Wilson',
      role: 'Wedding Planner',
      text: 'Saves hours of work with printable seating charts and live guest updates.',
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: 'How many photos and videos can guests upload?',
      answer: 'Free plan allows 10 photos + 10 videos. Paid plans offer unlimited uploads.',
    },
    {
      question: 'Is my guest data secure and private?',
      answer: 'Yes, all data is encrypted and stored securely. Only you can access your event data.',
    },
    {
      question: 'Can I print the seating charts and place cards?',
      answer: 'Absolutely! All printables are pixel-perfect A4 templates ready for your home or professional printer.',
    },
    {
      question: 'Do guests need to download an app?',
      answer: 'No! Everything works through their web browser by scanning your QR code.',
    },
    {
      question: 'What is the refund policy?',
      answer: 'We offer a 30-day money-back guarantee if you\'re not completely satisfied.',
    },
    {
      question: 'How do I get support if I need help?',
      answer: 'Email us anytime at support@weddingwaitress.com. We typically respond within 24 hours.',
    },
    {
      question: 'Can I upgrade my plan later?',
      answer: 'Yes, you can upgrade at any time to unlock more features and guest capacity.',
    },
    {
      question: 'How long is my data stored?',
      answer: 'Your event data and media are stored for 90 days after your event date. You can download everything before then.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b sticky top-0 bg-white z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-8 h-8" style={{ color: PRIMARY_COLOR }} />
              <span className="text-2xl font-bold" style={{ color: PRIMARY_COLOR }}>
                Wedding Waitress
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setShowSignIn(true)}>
                Sign In
              </Button>
              <Button 
                onClick={handleSignUp}
                style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}
                className="hover:opacity-90"
              >
                Start Free Now
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-purple-50 to-white">
        <div className="container mx-auto text-center max-w-5xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6" style={{ color: PRIMARY_COLOR }}>
            All-in-One Wedding Planning & Guest Experience
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            QR-code seating, photo & video sharing, audio guestbook, printables, and more—beautifully simple.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button 
              size="lg"
              onClick={handleSignUp}
              style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}
              className="text-lg px-8 py-6 hover:opacity-90"
            >
              Start Free Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6"
              style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR }}
            >
              <Play className="mr-2 w-5 h-5" />
              See Live Demo
            </Button>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <CheckCircle className="w-4 h-4 mr-2" style={{ color: PRIMARY_COLOR }} />
              Fast QR check-in
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <CheckCircle className="w-4 h-4 mr-2" style={{ color: PRIMARY_COLOR }} />
              Guest uploads
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <CheckCircle className="w-4 h-4 mr-2" style={{ color: PRIMARY_COLOR }} />
              Print-ready A4 templates
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              <CheckCircle className="w-4 h-4 mr-2" style={{ color: PRIMARY_COLOR }} />
              No app download
            </Badge>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="container mx-auto text-center">
          <p className="text-gray-600 mb-8">Trusted by DJs, planners, and venues</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" style={{ color: PRIMARY_COLOR }} />
                    ))}
                  </div>
                  <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                  <CardDescription>{testimonial.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 italic">"{testimonial.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: PRIMARY_COLOR }}>
              Everything You Need in One Place
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features that make wedding planning effortless
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Icon className="w-12 h-12 mb-4" style={{ color: PRIMARY_COLOR }} />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4">{feature.description}</p>
                    <a 
                      href={feature.link}
                      className="text-sm font-medium flex items-center hover:underline"
                      style={{ color: PRIMARY_COLOR }}
                    >
                      Learn more <ArrowRight className="w-4 h-4 ml-1" />
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: PRIMARY_COLOR }}>
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to your perfect wedding
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-2">
              <CardHeader>
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  1
                </div>
                <CardTitle>Create your event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Add guests, pick features</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2">
              <CardHeader>
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  2
                </div>
                <CardTitle>Share your QR</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Guests upload and RSVP</p>
              </CardContent>
            </Card>

            <Card className="text-center border-2">
              <CardHeader>
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  3
                </div>
                <CardTitle>Enjoy the day</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Live album, audio guestbook, ready-to-print docs</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: PRIMARY_COLOR }}>
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Free</CardTitle>
                <div className="text-4xl font-bold my-4" style={{ color: PRIMARY_COLOR }}>
                  $0
                </div>
                <CardDescription>Perfect for trying out</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                    <span>Up to 50 guests</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                    <span>10 photos + 10 videos</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                    <span>Basic features</span>
                  </li>
                </ul>
                <Button 
                  className="w-full mt-6"
                  variant="outline"
                  style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR }}
                  onClick={handleSignUp}
                >
                  Get Started Free
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan - Recommended */}
            <Card className="border-4 shadow-xl relative" style={{ borderColor: PRIMARY_COLOR }}>
              <div 
                className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                RECOMMENDED
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="text-4xl font-bold my-4" style={{ color: PRIMARY_COLOR }}>
                  $149
                  <span className="text-lg font-normal text-gray-600"> AUD</span>
                </div>
                <CardDescription>One-time payment</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                    <span>Up to 300 guests</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                    <span>Unlimited uploads</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                    <span>All features unlocked</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button 
                  className="w-full mt-6 text-white"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                  onClick={handleSignUp}
                >
                  Choose Pro
                </Button>
              </CardContent>
            </Card>

            {/* Venue/Team Plan */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Venue/Team</CardTitle>
                <div className="text-4xl font-bold my-4" style={{ color: PRIMARY_COLOR }}>
                  $149
                  <span className="text-lg font-normal text-gray-600"> /mo</span>
                </div>
                <CardDescription>For professionals</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                    <span>Unlimited events</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                    <span>Unlimited guests</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                    <span>White-label options</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: PRIMARY_COLOR }} />
                    <span>Team collaboration</span>
                  </li>
                </ul>
                <Button 
                  className="w-full mt-6"
                  variant="outline"
                  style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR }}
                  onClick={handleSignUp}
                >
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: PRIMARY_COLOR }}>
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-6 bg-white">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-purple-50 to-white">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-5xl font-bold mb-6" style={{ color: PRIMARY_COLOR }}>
            Ready to plan the perfect day?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of couples who've made their wedding planning easier
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={handleSignUp}
              style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}
              className="text-lg px-8 py-6 hover:opacity-90"
            >
              Start Free Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6"
              style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR }}
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                <span className="text-xl font-bold">Wedding Waitress</span>
              </div>
              <p className="text-gray-400 text-sm">
                All-in-one wedding planning & guest experience platform
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="text-gray-400 hover:text-white" style={{ color: PRIMARY_COLOR }}>Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white" style={{ color: PRIMARY_COLOR }}>Pricing</a></li>
                <li><a href="#faq" className="text-gray-400 hover:text-white" style={{ color: PRIMARY_COLOR }}>FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/privacy" className="text-gray-400 hover:text-white" style={{ color: PRIMARY_COLOR }}>Privacy Policy</a></li>
                <li><a href="/terms" className="text-gray-400 hover:text-white" style={{ color: PRIMARY_COLOR }}>Terms of Service</a></li>
                <li><a href="/contact" className="text-gray-400 hover:text-white" style={{ color: PRIMARY_COLOR }}>Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>support@weddingwaitress.com</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>© {new Date().getFullYear()} Wedding Waitress — Made with ❤️</p>
          </div>
        </div>
      </footer>

      {/* Auth Modals */}
      <SignInModal 
        open={showSignIn} 
        onOpenChange={setShowSignIn}
        onBackToSignUp={handleSignUp}
      />
    </div>
  );
}
