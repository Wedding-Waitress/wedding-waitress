/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Body redesigned 2026-04-18 to mirror homepage "Get in Touch" form (locked).
 * Header logo swapped 2026-04-18 to brown wordmark (matches homepage); adjacent text removed.
 * Includes contact form wired to send-transactional-email → support@weddingwaitress.com.
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/SEO/SeoHead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Please enter a valid email").max(255, "Email must be less than 255 characters"),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
});

export const Contact = () => {
  const { t } = useTranslation('landing');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Wedding Waitress',
    url: 'https://weddingwaitress.com/contact',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse({ name, email, message });
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof typeof errors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'contact-form-message',
          recipientEmail: 'support@weddingwaitress.com',
          idempotencyKey: `contact-${crypto.randomUUID()}`,
          templateData: {
            name: result.data.name,
            email: result.data.email,
            message: result.data.message,
            date: new Date().toISOString(),
          },
        },
      });
      if (error) throw error;
      toast.success("Your message has been sent successfully. We will reply within 24 hours.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error('Contact form send failed', err);
      toast.error("Something went wrong. Please try again or email support@weddingwaitress.com");
    } finally {
      setSubmitting(false);
    }
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

      {/* Main Content — mirrors homepage "Get in Touch" */}
      <main>
        <section id="contact" className="py-16 md:py-20 px-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
              {t('contact.title')}
            </h1>
            <p className="text-lg text-gray-500 text-center mb-16 max-w-xl mx-auto">
              {t('contact.subtitle')}
            </p>
            <form onSubmit={handleSubmit} className="bg-white rounded-[20px] p-8 md:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.08)]" noValidate>
              <div className="space-y-5">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1.5">{t('contact.name')}</label>
                  <input
                    id="contact-name"
                    type="text"
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FAFAFA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder={t('contact.namePlaceholder')}
                    aria-invalid={!!errors.name}
                    required
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1.5">{t('contact.email')}</label>
                  <input
                    id="contact-email"
                    type="email"
                    maxLength={255}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FAFAFA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder={t('contact.emailPlaceholder')}
                    aria-invalid={!!errors.email}
                    required
                  />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1.5">{t('contact.message')}</label>
                  <textarea
                    id="contact-message"
                    maxLength={2000}
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={submitting}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FAFAFA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                    placeholder={t('contact.messagePlaceholder')}
                    aria-invalid={!!errors.message}
                    required
                  />
                  {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-primary text-white hover:bg-primary/90 py-3"
                >
                  {submitting ? t('contact.sending') : (
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
