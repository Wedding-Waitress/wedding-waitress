import { PublicCopy } from '@/i18n/PublicCopy';
/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { SeoHead } from '@/components/SEO/SeoHead';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { PublicPageHero } from '@/components/Layout/PublicPageHero';
import { publicHeroForRoute } from '@/config/publicHeroManifest';
import '@/styles/PublicSite.css';

export const PrivacyPolicy = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="ww-public min-h-screen bg-gradient-subtle">
      <SeoHead
        title="Privacy Policy | Wedding Waitress"
        description="Learn how Wedding Waitress collects, uses, and protects your personal information when you use our wedding planning platform."
      />
      <Header />
      <PublicPageHero compact asset={publicHeroForRoute('/privacy')} eyebrow="Privacy" title="Privacy Policy" description="How Wedding Waitress collects, uses and protects your personal information." />

      {/* Main Content */}
      <main className="w-full px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="ww-box">
          <CardHeader className="text-center border-b pb-6">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold"><PublicCopy text={"Privacy Policy"} /></CardTitle>
            <p className="text-muted-foreground mt-2"><PublicCopy text={"Last Updated: 15 April "} />{currentYear}
            </p>
          </CardHeader>

          <CardContent className="prose prose-sm max-w-none p-8 space-y-6">
            {/* Table of Contents */}
            <div className="bg-muted/50 rounded-lg p-6 not-prose">
              <h3 className="font-semibold text-lg mb-4"><PublicCopy text={"Table of Contents"} /></h3>
              <ol className="space-y-2 text-sm">
                <li><a href="#introduction" className="text-primary hover:underline"><PublicCopy text={"1. Introduction"} /></a></li>
                <li><a href="#information-we-collect" className="text-primary hover:underline"><PublicCopy text={"2. Information We Collect"} /></a></li>
                <li><a href="#how-we-use" className="text-primary hover:underline"><PublicCopy text={"3. How We Use Your Information"} /></a></li>
                <li><a href="#data-sharing" className="text-primary hover:underline"><PublicCopy text={"4. Data Sharing and Disclosure"} /></a></li>
                <li><a href="#data-security" className="text-primary hover:underline"><PublicCopy text={"5. Data Security"} /></a></li>
                <li><a href="#your-rights" className="text-primary hover:underline"><PublicCopy text={"6. Your Rights"} /></a></li>
                <li><a href="#cookies" className="text-primary hover:underline"><PublicCopy text={"7. Cookies and Tracking"} /></a></li>
                <li><a href="#data-retention" className="text-primary hover:underline"><PublicCopy text={"8. Data Retention"} /></a></li>
                <li><a href="#international-users" className="text-primary hover:underline"><PublicCopy text={"9. International Users"} /></a></li>
                <li><a href="#childrens-privacy" className="text-primary hover:underline"><PublicCopy text={"10. Children's Privacy"} /></a></li>
                <li><a href="#changes" className="text-primary hover:underline"><PublicCopy text={"11. Changes to This Policy"} /></a></li>
                <li><a href="#contact" className="text-primary hover:underline"><PublicCopy text={"12. Contact Us"} /></a></li>
              </ol>
            </div>

            {/* Content Sections */}
            <section id="introduction">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"1. Introduction"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Welcome to Wedding Waitress. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our wedding and event management platform."} /></p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong><PublicCopy text={"Wedding Waitress"} /></strong><br /><PublicCopy text={"ABN: 60 418 261 323"} /><br /><PublicCopy text={"Location: Melbourne, Victoria, Australia"} /><br /><PublicCopy text={"Email: support@weddingwaitress.com.au"} /></p>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"By using Wedding Waitress, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services."} /></p>
            </section>

            <section id="information-we-collect">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"2. Information We Collect"} /></h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-3"><PublicCopy text={"2.1 Personal Information You Provide"} /></h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong><PublicCopy text={"Account Information:"} /></strong><PublicCopy text={" First name, last name, email address, mobile number, password"} /></li>
                <li><strong><PublicCopy text={"Event Information:"} /></strong><PublicCopy text={" Event names, dates, locations, guest lists, seating arrangements"} /></li>
                <li><strong><PublicCopy text={"Guest Information:"} /></strong><PublicCopy text={" Names, email addresses, dietary requirements, table assignments, RSVP status"} /></li>
                <li><strong><PublicCopy text={"Payment Information:"} /></strong><PublicCopy text={" Processed securely through Stripe (we do not store credit card details)"} /></li>
                <li><strong><PublicCopy text={"Profile Information:"} /></strong><PublicCopy text={" Display names, preferences, subscription details"} /></li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"2.2 Information Automatically Collected"} /></h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong><PublicCopy text={"Usage Data:"} /></strong><PublicCopy text={" Pages visited, features used, time spent, click patterns"} /></li>
                <li><strong><PublicCopy text={"Device Information:"} /></strong><PublicCopy text={" Browser type, operating system, device identifiers, IP address"} /></li>
                <li><strong><PublicCopy text={"Location Data:"} /></strong><PublicCopy text={" Approximate location based on IP address"} /></li>
                <li><strong><PublicCopy text={"Cookies and Tracking:"} /></strong><PublicCopy text={" Session cookies, preference cookies, analytics cookies"} /></li>
              </ul>
            </section>

            <section id="how-we-use">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"3. How We Use Your Information"} /></h2>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"We use the information we collect for the following purposes:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong><PublicCopy text={"Service Delivery:"} /></strong><PublicCopy text={" To provide, maintain, and improve our wedding and event management services"} /></li>
                <li><strong><PublicCopy text={"Account Management:"} /></strong><PublicCopy text={" To create and manage your account, authenticate your identity"} /></li>
                <li><strong><PublicCopy text={"Event Management:"} /></strong><PublicCopy text={" To help you organize guests, seating charts, QR codes, and event materials"} /></li>
                <li><strong><PublicCopy text={"Communication:"} /></strong><PublicCopy text={" To send you service updates, technical notices, support messages"} /></li>
                <li><strong><PublicCopy text={"Payment Processing:"} /></strong><PublicCopy text={" We process payments securely via Stripe. Wedding Waitress does not store credit card details. Wedding plans are one-time purchases. Stripe processes payments on our behalf in accordance with their privacy policy."} /></li>
                <li><strong><PublicCopy text={"Analytics:"} /></strong><PublicCopy text={" To understand how our services are used and improve user experience"} /></li>
                <li><strong><PublicCopy text={"Marketing:"} /></strong><PublicCopy text={" To send promotional emails and updates about Wedding Waitress. You may opt out of marketing communications at any time by clicking \"unsubscribe\" or contacting us directly."} /></li>
                <li><strong><PublicCopy text={"Legal Compliance:"} /></strong><PublicCopy text={" To comply with legal obligations and enforce our terms"} /></li>
              </ul>
            </section>

            <section id="data-sharing">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"4. Data Sharing and Disclosure"} /></h2>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"We do not sell your personal information. We may share your data with trusted third-party providers who assist us in operating the platform."} /></p>
              
              <h3 className="text-xl font-semibold text-foreground mb-3"><PublicCopy text={"4.1 Service Providers"} /></h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong><PublicCopy text={"Supabase:"} /></strong><PublicCopy text={" Database hosting and authentication services"} /></li>
                <li><strong><PublicCopy text={"Stripe:"} /></strong><PublicCopy text={" Payment processing (PCI-DSS compliant)"} /></li>
                <li><strong><PublicCopy text={"Cloud Storage:"} /></strong><PublicCopy text={" For storing event materials and QR codes"} /></li>
                <li><strong><PublicCopy text={"Email Services:"} /></strong><PublicCopy text={" For sending notifications and verification emails"} /></li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"These providers process data on our behalf and are contractually obligated to protect your information."} /></p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"4.2 Legal Requirements"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"We may disclose your information if required by law, court order, or government request, or to protect our rights, safety, or property."} /></p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"4.3 Business Transfers"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"If Wedding Waitress is involved in a merger, acquisition, or asset sale, your information may be transferred as part of that transaction."} /></p>
            </section>

            <section id="data-security">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"5. Data Security"} /></h2>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"We implement industry-standard security measures to protect your information:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong><PublicCopy text={"Encryption:"} /></strong><PublicCopy text={" All data transmitted via HTTPS/TLS encryption"} /></li>
                <li><strong><PublicCopy text={"Authentication:"} /></strong><PublicCopy text={" Secure password hashing and email verification"} /></li>
                <li><strong><PublicCopy text={"Access Controls:"} /></strong><PublicCopy text={" Row-level security policies in our database"} /></li>
                <li><strong><PublicCopy text={"Payment Security:"} /></strong><PublicCopy text={" PCI-DSS compliant payment processing via Stripe"} /></li>
                <li><strong><PublicCopy text={"Regular Audits:"} /></strong><PublicCopy text={" Security assessments and vulnerability testing"} /></li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security."} /></p>
            </section>

            <section id="your-rights">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"6. Your Rights"} /></h2>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"Under Australian Privacy Law and, where applicable, GDPR or other international data protection laws, you may have the following rights:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong><PublicCopy text={"Access:"} /></strong><PublicCopy text={" Request a copy of your personal information"} /></li>
                <li><strong><PublicCopy text={"Correction:"} /></strong><PublicCopy text={" Update or correct inaccurate information"} /></li>
                <li><strong><PublicCopy text={"Deletion:"} /></strong><PublicCopy text={" Request deletion of your account and personal data"} /></li>
                <li><strong><PublicCopy text={"Portability:"} /></strong><PublicCopy text={" Export your data in a machine-readable format"} /></li>
                <li><strong><PublicCopy text={"Objection:"} /></strong><PublicCopy text={" Object to certain processing activities"} /></li>
                <li><strong><PublicCopy text={"Opt-Out:"} /></strong><PublicCopy text={" Unsubscribe from marketing communications"} /></li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"To exercise these rights, email us at "} /><a href="mailto:support@weddingwaitress.com.au" className="text-primary hover:underline"><PublicCopy text={"support@weddingwaitress.com.au"} /></a><PublicCopy text={". We will respond within 30 days."} /></p>
            </section>

            <section id="cookies">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"7. Cookies and Tracking"} /></h2>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"We use cookies and similar tracking technologies to improve your experience:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong><PublicCopy text={"Essential Cookies:"} /></strong><PublicCopy text={" Required for authentication and core functionality"} /></li>
                <li><strong><PublicCopy text={"Preference Cookies:"} /></strong><PublicCopy text={" Remember your settings and preferences"} /></li>
                <li><strong><PublicCopy text={"Analytics Cookies:"} /></strong><PublicCopy text={" Help us understand usage patterns"} /></li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"You can control cookies through your browser settings. Note that disabling certain cookies may affect service functionality."} /></p>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"By using our website, you consent to the use of cookies. You may control or disable cookies through your browser settings. Disabling cookies may affect certain features of the platform."} /></p>
            </section>

            <section id="data-retention">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"8. Data Retention"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"We retain your information for as long as your account is active or as needed to provide services. After account deletion, we may retain certain information for:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li><PublicCopy text={"Legal compliance and tax purposes (up to 7 years)"} /></li>
                <li><PublicCopy text={"Fraud prevention and security"} /></li>
                <li><PublicCopy text={"Resolving disputes"} /></li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"You can request immediate deletion of your data by contacting support, subject to legal obligations."} /></p>
            </section>

            <section id="international-users">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"9. International Users"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Wedding Waitress is accessible globally. By using our platform, you acknowledge that your data may be processed and stored in servers located outside your country, including Australia. We take reasonable steps to ensure your data is handled securely and in accordance with this policy."} /></p>
            </section>

            <section id="childrens-privacy">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"10. Children's Privacy"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Wedding Waitress is not intended for children under 18. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately."} /></p>
            </section>

            <section id="changes">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"11. Changes to This Policy"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"We may update this Privacy Policy from time to time. We will notify you of significant changes by:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li><PublicCopy text={"Posting the updated policy on this page with a new \"Last Updated\" date"} /></li>
                <li><PublicCopy text={"Sending an email notification to your registered email address"} /></li>
                <li><PublicCopy text={"Displaying a notice in your dashboard"} /></li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"Your continued use of Wedding Waitress after changes take effect constitutes acceptance of the updated policy."} /></p>
            </section>

            <section id="contact">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"12. Contact Us"} /></h2>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"If you have questions or concerns about this Privacy Policy, please contact us:"} /></p>
              <div className="bg-muted/50 rounded-lg p-6 not-prose">
                <p className="font-semibold text-foreground mb-2"><PublicCopy text={"Wedding Waitress"} /></p>
                <p className="text-muted-foreground text-sm"><PublicCopy text={"ABN: 60 418 261 323"} /></p>
                <p className="text-muted-foreground text-sm"><PublicCopy text={"Melbourne, Victoria, Australia"} /></p>
                <p className="text-muted-foreground text-sm mt-4"><PublicCopy text={"Email: "} /><a href="mailto:support@weddingwaitress.com.au" className="text-primary hover:underline"><PublicCopy text={"support@weddingwaitress.com.au"} /></a>
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"You may also contact us to request deletion of your data or closure of your account."} /></p>
            </section>

            {/* Back to Top */}
            <div className="text-center pt-8 border-t not-prose">
              <Link to="/">
                <Button variant="default" size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <ArrowLeft className="w-4 h-4 mr-2" /><PublicCopy text={"Back to Home"} /></Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
