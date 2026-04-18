/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { ArrowLeft, Mail, Building2, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SeoHead } from "@/components/SEO/SeoHead";

export const Contact = () => {
  const currentYear = new Date().getFullYear();

  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Wedding Waitress',
    url: 'https://weddingwaitress.com/contact',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <SeoHead
        title="Contact Us | Wedding Waitress"
        description="Get in touch with the Wedding Waitress team. We're here to help with your wedding planning, guest list, seating, and RSVP questions."
        jsonLd={contactJsonLd}
      />
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src="/wedding-waitress-new-logo.png" 
              alt="Wedding Waitress Logo" 
              className="h-10 w-auto"
            />
            <span className="font-semibold text-lg">Wedding Waitress</span>
          </Link>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <Card className="p-8 md:p-12">
          <div className="space-y-8">
            {/* Title */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
              <p className="text-lg text-muted-foreground">
                We're here to help with your wedding planning needs
              </p>
            </div>

            {/* Contact Information */}
            <div className="grid gap-6 md:grid-cols-2 mt-8">
              {/* Company Info */}
              <div className="space-y-4 p-6 rounded-lg bg-secondary/50">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Company Details</h3>
                    <p className="text-sm text-muted-foreground">Wedding Waitress</p>
                    <p className="text-sm text-muted-foreground">ABN: 60 418 261 323</p>
                  </div>
                </div>
              </div>

              {/* Email Support */}
              <div className="space-y-4 p-6 rounded-lg bg-secondary/50">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Email Support</h3>
                    <a 
                      href="mailto:support@weddingwaitress.com"
                      className="text-sm text-primary hover:underline"
                    >
                      support@weddingwaitress.com
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">
                      We typically respond within 24 hours
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-8 p-6 rounded-lg bg-primary/5 border border-primary/20">
              <h3 className="font-semibold mb-3">How Can We Help?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Technical support with your event setup</li>
                <li>• Questions about features and functionality</li>
                <li>• Billing and subscription inquiries</li>
                <li>• General wedding planning assistance</li>
                <li>• Feedback and suggestions</li>
              </ul>
            </div>

            {/* CTA */}
            <div className="text-center pt-4">
              <Link to="/">
                <Button size="lg" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>© {currentYear} Wedding Waitress. All rights reserved.</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <Link to="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <span>•</span>
              <Link to="/contact" className="hover:text-primary transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
