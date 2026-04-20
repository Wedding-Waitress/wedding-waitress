/**
 * 🔒 SHARED CONTACT FORM — single source of truth for homepage + /contact.
 * Locked 2026-04-20. DO NOT MODIFY without explicit owner approval.
 * See LOCKED_TRANSLATION_KEYS.md.
 *
 * Field order: Full Name → Email → Type of Event → Message.
 * Wired to send-transactional-email → support@weddingwaitress.com.
 */
import { useState } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const contactSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Full name must be less than 100 characters"),
  email: z.string().trim().email("Please enter a valid email").max(255, "Email must be less than 255 characters"),
  eventType: z.string().trim().min(1, "Event type is required").max(100, "Event type must be less than 100 characters"),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
});

export const ContactForm = () => {
  const { t } = useTranslation("landing");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [eventType, setEventType] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; eventType?: string; message?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse({ fullName, email, eventType, message });
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
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-form-message",
          recipientEmail: "support@weddingwaitress.com",
          idempotencyKey: `contact-${crypto.randomUUID()}`,
          templateData: {
            name: result.data.fullName,
            email: result.data.email,
            eventType: result.data.eventType,
            message: result.data.message,
            date: new Date().toISOString(),
          },
        },
      });
      if (error) throw error;
      toast.success("Your message has been sent successfully. We will reply within 24 hours.");
      setFullName("");
      setEmail("");
      setEventType("");
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      console.error("Contact form send failed", err);
      toast.error("Something went wrong. Please try again or email support@weddingwaitress.com");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-[20px] p-5 sm:p-8 md:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.08)]"
      noValidate
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="contact-fullname" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t("contact.fullName")}
          </label>
          <input
            id="contact-fullname"
            type="text"
            maxLength={100}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={submitting}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FAFAFA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder={t("contact.fullNamePlaceholder")}
            aria-invalid={!!errors.fullName}
            required
          />
          {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t("contact.email")}
          </label>
          <input
            id="contact-email"
            type="email"
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FAFAFA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder={t("contact.emailPlaceholder")}
            aria-invalid={!!errors.email}
            required
          />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="contact-event-type" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t("contact.eventType")}
          </label>
          <input
            id="contact-event-type"
            type="text"
            maxLength={100}
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            disabled={submitting}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FAFAFA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder={t("contact.eventTypePlaceholder")}
            aria-invalid={!!errors.eventType}
            required
          />
          {errors.eventType && <p className="text-xs text-destructive mt-1">{errors.eventType}</p>}
        </div>
        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t("contact.message")}
          </label>
          <textarea
            id="contact-message"
            maxLength={2000}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={submitting}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#FAFAFA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            placeholder={t("contact.messagePlaceholder")}
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
          {submitting ? t("contact.sending") : sent ? t("contact.sent") : (
            <>
              {t("contact.sendButton")}
              <Send className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default ContactForm;
