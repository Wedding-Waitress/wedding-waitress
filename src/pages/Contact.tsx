/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Body uses shared `ContactForm` component (locked 2026-04-20) — single source of truth
 * shared with the homepage Get-in-Touch section. See src/components/ContactForm.tsx.
 * Header logo: brown wordmark (matches homepage).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/SEO/SeoHead";
import { ContactForm } from "@/components/ContactForm";

export const Contact = () => {
  const { t } = useTranslation('landing');

  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Wedding Waitress',
    url: 'https://weddingwaitress.netlify.app/contact',
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
          <Link to="/" className="flex items-center">
            <img
              src="/wedding-waitress-logo-full.png"
              alt="Wedding Waitress Logo"
              className="h-12 lg:h-14 w-auto"
            />
          </Link>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content — uses shared ContactForm */}
      <main>
        <section id="contact" className="py-16 md:py-20 px-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
              {t('contact.title')}
            </h1>
            <p className="text-lg text-gray-500 text-center mb-16 max-w-xl mx-auto">
              {t('contact.subtitle')}
            </p>
            <ContactForm />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Wedding Waitress. All rights reserved.</p>
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
