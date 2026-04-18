/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Body redesigned 2026-04-18 to mirror homepage "Get in Touch" form (locked).
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
  const currentYear = new Date().getFullYear();
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
      toast.success("Thank you, your message has been sent. We will reply within 24 hours.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error('Contact form send failed', err);
      toast.error("Something went wrong. Please try again or email us directly.");
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

            {/* Contact Form */}
            <div className="mt-8 p-6 md:p-8 rounded-lg border border-border bg-background">
              <h3 className="font-semibold text-xl mb-1">Send us a message</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Fill in the form below and we'll get back to you within 24 hours.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    disabled={submitting}
                    placeholder="Your full name"
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    disabled={submitting}
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    disabled={submitting}
                    placeholder="How can we help?"
                    rows={6}
                    aria-invalid={!!errors.message}
                  />
                  {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                </div>
                <Button type="submit" disabled={submitting} className="w-full sm:w-auto gap-2">
                  <Send className="w-4 h-4" />
                  {submitting ? "Sending…" : "Send Message"}
                </Button>
              </form>
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
