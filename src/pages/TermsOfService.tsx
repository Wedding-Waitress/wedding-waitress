/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { SeoHead } from '@/components/SEO/SeoHead';

export const TermsOfService = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SeoHead
        title="Terms of Service | Wedding Waitress"
        description="Read the Terms of Service for Wedding Waitress, the all-in-one wedding planning app for managing guests, seating, and RSVPs."
      />
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl">Wedding Waitress</span>
          </Link>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="ww-box">
          <CardHeader className="text-center border-b pb-6">
            <div className="flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
            <p className="text-muted-foreground mt-2">
              Last Updated: 15 April {currentYear}
            </p>
          </CardHeader>

          <CardContent className="prose prose-sm max-w-none p-8 space-y-6">
            {/* Table of Contents */}
            <div className="bg-muted/50 rounded-lg p-6 not-prose">
              <h3 className="font-semibold text-lg mb-4">Table of Contents</h3>
              <ol className="space-y-2 text-sm">
                <li><a href="#agreement" className="text-primary hover:underline">1. Agreement to Terms</a></li>
                <li><a href="#services" className="text-primary hover:underline">2. Description of Services</a></li>
                <li><a href="#pricing" className="text-primary hover:underline">3. Subscription Plans & Pricing</a></li>
                <li><a href="#account" className="text-primary hover:underline">4. Account Registration</a></li>
                <li><a href="#acceptable-use" className="text-primary hover:underline">5. Acceptable Use</a></li>
                <li><a href="#user-content" className="text-primary hover:underline">6. User Content and Data</a></li>
                <li><a href="#payment" className="text-primary hover:underline">7. Payment Terms</a></li>
                <li><a href="#refunds" className="text-primary hover:underline">8. Refund Policy</a></li>
                <li><a href="#cancellation" className="text-primary hover:underline">9. Cancellation Policy</a></li>
                <li><a href="#intellectual-property" className="text-primary hover:underline">10. Intellectual Property</a></li>
                <li><a href="#disclaimers" className="text-primary hover:underline">11. Disclaimers</a></li>
                <li><a href="#limitation" className="text-primary hover:underline">12. Limitation of Liability</a></li>
                <li><a href="#indemnification" className="text-primary hover:underline">13. Indemnification</a></li>
                <li><a href="#termination" className="text-primary hover:underline">14. Termination</a></li>
                <li><a href="#governing-law" className="text-primary hover:underline">15. Governing Law</a></li>
                <li><a href="#changes" className="text-primary hover:underline">16. Changes to Terms</a></li>
                <li><a href="#contact" className="text-primary hover:underline">17. Contact Information</a></li>
              </ol>
            </div>

            {/* Content Sections */}
            <section id="agreement">
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Wedding Waitress ("Service", "Platform", "we", "us", "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use our Service.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>Wedding Waitress</strong><br />
                ABN: 60 418 261 323<br />
                Location: Melbourne, Victoria, Australia<br />
                Email: support@weddingwaitress.com
              </p>
            </section>

            <section id="services">
              <h2 className="text-2xl font-bold text-foreground mb-4">2. Description of Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Wedding Waitress provides a comprehensive wedding and event management platform including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Guest list management and RSVP tracking</li>
                <li>Seating chart creation and visualization</li>
                <li>QR code generation for table assignments</li>
                <li>Place cards, signage, and printable materials</li>
                <li>Floor plan designer</li>
                <li>Kitchen dietary requirements chart</li>
                <li>Live View kiosk mode for guests</li>
                <li>Event coordination tools</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We reserve the right to modify, suspend, or discontinue any feature at any time without prior notice.
              </p>
            </section>

            <section id="pricing">
              <h2 className="text-2xl font-bold text-foreground mb-4">3. Subscription Plans & Pricing</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Wedding Waitress offers both one-time purchase plans and monthly subscription plans:
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3">A. For Wedding Couples & Event Organisers (One-Time Purchase)</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Wedding Waitress offers one-time payment plans that provide access to the platform for a fixed period.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-6 space-y-4 not-prose">
                <div>
                  <h4 className="font-bold text-foreground mb-2">1. Starter Free Trial</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>7-day free trial</li>
                    <li>Up to 20 guests</li>
                    <li>Full access to platform features during trial</li>
                    <li>Upgrade required after trial ends to continue use</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-2">2. Essential Plan</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>One-time payment</li>
                    <li>Up to 100 guests</li>
                    <li>Access valid for 12 months</li>
                    <li>Includes full access to all wedding & event planning tools</li>
                    <li>Limited to 1 event</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-2">3. Premium Plan</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>One-time payment</li>
                    <li>Up to 300 guests</li>
                    <li>Access valid for 12 months</li>
                    <li>Includes full access to all wedding & event planning tools</li>
                    <li>Limited to 1 event</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-2">4. Unlimited Plan</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>One-time payment</li>
                    <li>Unlimited guests</li>
                    <li>Access valid for 12 months</li>
                    <li>Includes full access to all wedding & event planning tools</li>
                    <li>Limited to 1 event</li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-bold text-foreground mb-2">Plan Expiry & Grace Period</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>All paid plans are valid for 12 months from purchase date</li>
                    <li>After expiry, users receive 6 months read-only access</li>
                    <li>After the grace period, access may be restricted or removed</li>
                    <li>Wedding Waitress reserves the right to modify plan limits, pricing, or features at any time, with reasonable notice to users</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">B. For Wedding Vendors & Event Professionals (Subscription)</h3>
              
              <div className="bg-muted/50 rounded-lg p-6 space-y-4 not-prose">
                <div>
                  <h4 className="font-bold text-foreground mb-2">Vendor Pro Plan</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>Monthly recurring subscription</li>
                    <li>Designed for venues, wedding planners, and event professionals</li>
                    <li>Includes:
                      <ul className="list-disc pl-6 space-y-1 mt-1">
                        <li>Unlimited events</li>
                        <li>Unlimited guests</li>
                        <li>Full platform access</li>
                      </ul>
                    </li>
                    <li>Subscription remains active until cancelled</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">C. RSVP Invite Bundles (One-Time Add-On)</h3>
              <p className="text-muted-foreground leading-relaxed mb-2">
                RSVP bundles are optional add-ons purchased per event and based on guest count.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Pricing varies depending on the number of guests selected</li>
                <li>Once purchased and used, RSVP bundles are non-refundable</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">D. Plan Extensions (Optional Add-On)</h3>
              <p className="text-muted-foreground leading-relaxed mb-2">
                Users may purchase extensions to extend their plan duration.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Available for Essential, Premium, and Unlimited plans</li>
                <li>Duration options may vary (e.g., monthly or yearly extensions)</li>
                <li>Pricing varies depending on plan type and extension length</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Promotional Codes</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may offer promotional codes or discounts from time to time. These codes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>Must be applied at checkout</li>
                <li>Cannot be combined with other offers unless explicitly stated</li>
                <li>Have expiration dates and usage limits</li>
                <li>Are non-transferable and have no cash value</li>
              </ul>
            </section>

            <section id="account">
              <h2 className="text-2xl font-bold text-foreground mb-4">4. Account Registration</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To use Wedding Waitress, you must create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your password and account</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Be at least 18 years of age</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We reserve the right to suspend or terminate accounts that violate these Terms or are suspected of fraudulent activity.
              </p>
            </section>

            <section id="acceptable-use">
              <h2 className="text-2xl font-bold text-foreground mb-4">5. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree NOT to use the Service to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Scrape or extract data without permission</li>
                <li>Resell or redistribute our services without authorization</li>
                <li>Use the Service for spam or unsolicited marketing</li>
              </ul>
            </section>

            <section id="user-content">
              <h2 className="text-2xl font-bold text-foreground mb-4">6. User Content and Data</h2>
              <h3 className="text-xl font-semibold text-foreground mb-3">6.1 Your Content</h3>
              <p className="text-muted-foreground leading-relaxed">
                You retain ownership of all content you upload to Wedding Waitress (guest lists, event details, images, etc.). By uploading content, you grant us a limited license to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>Store and display your content to provide the Service</li>
                <li>Process your content to generate QR codes, seating charts, and printables</li>
                <li>Back up your content for disaster recovery</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">6.2 Responsibility for Content</h3>
              <p className="text-muted-foreground leading-relaxed">
                You are solely responsible for your content and ensure that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>You have the right to share guest information</li>
                <li>Your content does not violate privacy laws or regulations</li>
                <li>Your content does not infringe on third-party rights</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">6.3 Data Backup</h3>
              <p className="text-muted-foreground leading-relaxed">
                While we implement regular backups, you are responsible for maintaining your own copies of important data. We are not liable for data loss.
              </p>
            </section>

            <section id="payment">
              <h2 className="text-2xl font-bold text-foreground mb-4">7. Payment Terms</h2>
              <h3 className="text-xl font-semibold text-foreground mb-3">7.1 Payment Processing</h3>
              <p className="text-muted-foreground leading-relaxed">
                All payments are processed securely through Stripe, a PCI-DSS compliant payment processor. We do not store your credit card information on our servers.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">7.2 Plan Access</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Wedding plans are one-time purchases and do not auto-renew</li>
                <li>Vendor Pro is a recurring subscription billed monthly</li>
                <li>Access to features is granted instantly upon successful payment</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">7.3 Monthly Subscriptions (Vendor Plans)</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Subscriptions are billed in advance on a monthly basis</li>
                <li>Your subscription automatically renews each month</li>
                <li>You will be charged on the same day each month</li>
                <li>You can cancel at any time (see Cancellation Policy)</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">7.4 Failed Payments</h3>
              <p className="text-muted-foreground leading-relaxed">
                If a payment fails:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>We will attempt to charge your card again</li>
                <li>Your account may be suspended after 3 failed attempts</li>
                <li>You will receive email notifications about payment issues</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">7.5 Price Changes</h3>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to change our pricing at any time. For existing customers:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>One-time purchases are honored at the original price</li>
                <li>Monthly subscriptions: 30 days' notice before price changes</li>
                <li>You may cancel before the new price takes effect</li>
              </ul>
            </section>

            <section id="refunds">
              <h2 className="text-2xl font-bold text-foreground mb-4">8. Refund Policy</h2>
              <h3 className="text-xl font-semibold text-foreground mb-3">8.1 Free Trials</h3>
              <p className="text-muted-foreground leading-relaxed">
                Free trials are risk-free. No payment is required during the trial period.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">8.2 One-Time Purchases (Wedding Couples)</h3>
              <p className="text-muted-foreground leading-relaxed">
                Paid plans are generally <strong>non-refundable</strong> once activated. If you believe there has been an error, please contact support@weddingwaitress.com.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">8.3 Monthly Subscriptions (Vendor Plans)</h3>
              <p className="text-muted-foreground leading-relaxed">
                Subscription cancellations stop future billing only. However:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>You can cancel at any time to prevent future charges</li>
                <li>Access continues until the end of your current billing period</li>
                <li>No refunds for partial months</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">8.4 Add-ons</h3>
              <p className="text-muted-foreground leading-relaxed">
                Add-on purchases (including RSVP bundles and plan extensions) are non-refundable once activated.
              </p>
            </section>

            <section id="cancellation">
              <h2 className="text-2xl font-bold text-foreground mb-4">9. Cancellation Policy</h2>
              <h3 className="text-xl font-semibold text-foreground mb-3">9.1 Cancelling Monthly Subscriptions</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can cancel your monthly subscription at any time:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>Go to your Billing settings in the dashboard</li>
                <li>Click "Cancel Subscription"</li>
                <li>Cancellation takes effect at the end of your current billing period</li>
                <li>No partial refunds for unused time</li>
                <li>You can resubscribe at any time</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">9.2 Account Deletion</h3>
              <p className="text-muted-foreground leading-relaxed">
                To permanently delete your account:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>Cancel any active subscriptions first</li>
                <li>Email support@weddingwaitress.com to request account deletion</li>
                <li>All your data will be permanently deleted within 30 days</li>
                <li>This action cannot be undone</li>
              </ul>
            </section>

            <section id="intellectual-property">
              <h2 className="text-2xl font-bold text-foreground mb-4">10. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                Wedding Waitress and all associated content, features, and functionality are owned by Wedding Waitress (ABN 60 418 261 323) and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You may not:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>Copy, modify, or distribute our software or content</li>
                <li>Reverse engineer or decompile our code</li>
                <li>Remove copyright notices or branding</li>
                <li>Use our trademarks without permission</li>
              </ul>
            </section>

            <section id="disclaimers">
              <h2 className="text-2xl font-bold text-foreground mb-4">11. Disclaimers</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Warranties of merchantability or fitness for a particular purpose</li>
                <li>Warranties that the Service will be uninterrupted or error-free</li>
                <li>Warranties that data will be accurate or reliable</li>
                <li>Warranties regarding security or data protection</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We do not guarantee that Wedding Waitress will meet all your requirements or that it will be available at all times. You use the Service at your own risk.
              </p>
            </section>

            <section id="limitation">
              <h2 className="text-2xl font-bold text-foreground mb-4">12. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WEDDING WAITRESS SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>Any indirect, incidental, special, or consequential damages</li>
                <li>Loss of profits, data, or business opportunities</li>
                <li>Damages arising from your use or inability to use the Service</li>
                <li>Damages from unauthorized access to your data</li>
                <li>Damages from errors, bugs, or service interruptions</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Our total liability to you for any claims related to the Service is limited to the amount you paid us in the 12 months preceding the claim, or $100 AUD, whichever is greater.
              </p>

              <div className="mt-8">
                <h3 className="text-xl font-semibold text-foreground mb-3">Data Loss & Platform Use Disclaimer</h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Wedding Waitress is provided on an "as-is" and "as-available" basis.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  While we strive to provide a reliable and secure platform, we do not guarantee that the service will be uninterrupted, error-free, or free from data loss.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  By using the platform, you acknowledge and agree that:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>You are solely responsible for maintaining your own copies or backups of important data</li>
                  <li>Wedding Waitress is not liable for any loss of data, including guest lists, event details, or uploaded content</li>
                  <li>We are not responsible for any interruptions, system failures, bugs, or technical issues that may result in loss or disruption</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3 font-semibold">
                  Use of the platform is at your own risk.
                </p>
              </div>
            </section>

            <section id="indemnification">
              <h2 className="text-2xl font-bold text-foreground mb-4">13. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless Wedding Waitress, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>Your violation of these Terms</li>
                <li>Your violation of any laws or third-party rights</li>
                <li>Your content or use of the Service</li>
                <li>Your negligence or misconduct</li>
              </ul>
            </section>

            <section id="termination">
              <h2 className="text-2xl font-bold text-foreground mb-4">14. Termination</h2>
              <h3 className="text-xl font-semibold text-foreground mb-3">14.1 Termination by You</h3>
              <p className="text-muted-foreground leading-relaxed">
                You may terminate your account at any time by canceling your subscription and requesting account deletion.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">14.2 Termination by Us</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may suspend or terminate your account if:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>You violate these Terms</li>
                <li>Your account is involved in fraudulent activity</li>
                <li>You fail to pay required fees</li>
                <li>We are required to do so by law</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">14.3 Effect of Termination</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upon termination:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>Your access to the Service will be immediately revoked</li>
                <li>Your data may be deleted after 30 days</li>
                <li>Sections of these Terms that should survive will remain in effect</li>
              </ul>
            </section>

            <section id="governing-law">
              <h2 className="text-2xl font-bold text-foreground mb-4">15. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of Victoria, Australia. Any disputes will be resolved in the courts of Victoria, Australia. You agree to submit to the exclusive jurisdiction of these courts.
              </p>
            </section>

            <section id="changes">
              <h2 className="text-2xl font-bold text-foreground mb-4">16. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these Terms from time to time. We will notify you of significant changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>Posting the updated Terms on this page with a new "Last Updated" date</li>
                <li>Sending an email notification to your registered email</li>
                <li>Displaying a notice in your dashboard</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Your continued use of Wedding Waitress after changes take effect constitutes acceptance of the updated Terms. If you do not agree to the new Terms, you must stop using the Service and cancel your account.
              </p>
            </section>

            <section id="contact">
              <h2 className="text-2xl font-bold text-foreground mb-4">17. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have questions or concerns about these Terms of Service, please contact us:
              </p>
              <div className="bg-muted/50 rounded-lg p-6 not-prose">
                <p className="font-semibold text-foreground mb-2">Wedding Waitress</p>
                <p className="text-muted-foreground text-sm">ABN: 60 418 261 323</p>
                <p className="text-muted-foreground text-sm">Melbourne, Victoria, Australia</p>
                <p className="text-muted-foreground text-sm mt-4">
                  Email: <a href="mailto:support@weddingwaitress.com" className="text-primary hover:underline">support@weddingwaitress.com</a>
                </p>
              </div>
            </section>

            {/* Acknowledgment */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 not-prose">
              <p className="text-sm text-foreground">
                <strong>ACKNOWLEDGMENT:</strong> By using Wedding Waitress, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
              </p>
            </div>

            {/* Back to Top */}
            <div className="text-center pt-8 border-t not-prose">
              <Link to="/">
                <Button variant="default" size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/95">
        <div className="w-full px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© {currentYear} Wedding Waitress. All rights reserved.</p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              <span>•</span>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
