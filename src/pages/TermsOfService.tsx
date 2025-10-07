import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

export const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
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
              Last Updated: 20 January 2025
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

              <h3 className="text-xl font-semibold text-foreground mb-3">A. FOR WEDDING COUPLES & EVENT ORGANIZERS (One-Time Purchase)</h3>
              
              <div className="bg-muted/50 rounded-lg p-6 space-y-4 not-prose">
                <div>
                  <h4 className="font-bold text-foreground mb-2">1. Starter Plan (FREE)</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>Up to 10 guests</li>
                    <li>Access to all Wedding Waitress features</li>
                    <li>Perfect for testing and small intimate gatherings</li>
                    <li>No credit card required</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-2">2. Essential Plan ($99 AUD one-time)</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>Up to 100 guests</li>
                    <li>All features included</li>
                    <li>Ideal for typical weddings and events</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-2">3. Premium Plan ($149 AUD one-time)</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>101 to 300 guests</li>
                    <li>All features included</li>
                    <li>Perfect for large weddings and events</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-2">4. Unlimited Plan ($249 AUD one-time)</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>Unlimited guests</li>
                    <li>All features included</li>
                    <li>Best for wedding planners managing multiple large events</li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-bold text-foreground mb-2">Add-ons (available for all plans):</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>Extra Event Slot: $19 AUD</li>
                    <li>Priority Support: $29 AUD</li>
                    <li>Custom Branding: $49 AUD</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">B. FOR WEDDING VENDORS & EVENT PROFESSIONALS (Monthly Subscription)</h3>
              
              <div className="bg-muted/50 rounded-lg p-6 space-y-4 not-prose">
                <div>
                  <h4 className="font-bold text-foreground mb-2">1. Vendor Basic ($49 AUD/month)</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>Up to 5 active events</li>
                    <li>Unlimited guests per event</li>
                    <li>All Wedding Waitress features</li>
                    <li>Multi-user accounts</li>
                    <li>Vendor branding</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-2">2. Vendor Pro ($149 AUD/month)</h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li>Unlimited active events</li>
                    <li>Unlimited guests per event</li>
                    <li>All features included</li>
                    <li>White-label Live View</li>
                    <li>Custom domain support</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Usage Limits and Upgrades</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Guest Limits:</strong> Free Starter Plan users are limited to 10 guests. Upon reaching this limit, you will be prompted to upgrade to a paid plan.</li>
                <li><strong>Upgrades:</strong> You may upgrade your plan at any time. Upgrades are immediate and unlock higher guest limits instantly.</li>
                <li><strong>Overage Policy:</strong> You cannot add guests beyond your plan's limit. An upgrade is required before adding additional guests.</li>
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

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">7.2 One-Time Purchases</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Payment is charged immediately upon purchase</li>
                <li>Access to features is granted instantly upon successful payment</li>
                <li>One-time purchases are non-recurring</li>
                <li>Subject to 14-day money-back guarantee (see Refund Policy)</li>
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
              <h3 className="text-xl font-semibold text-foreground mb-3">8.1 One-Time Purchases (Wedding Couples)</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We offer a <strong>14-day money-back guarantee</strong> for one-time purchases:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Request a refund within 14 days of purchase</li>
                <li>Email support@weddingwaitress.com with your order details</li>
                <li>Full refund processed within 5-10 business days</li>
                <li>No questions asked</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">8.2 Monthly Subscriptions (Vendor Plans)</h3>
              <p className="text-muted-foreground leading-relaxed">
                Monthly subscriptions are <strong>non-refundable</strong>. However:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li>You can cancel at any time to prevent future charges</li>
                <li>Access continues until the end of your current billing period</li>
                <li>No refunds for partial months</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">8.3 Add-ons</h3>
              <p className="text-muted-foreground leading-relaxed">
                Add-on purchases are non-refundable once activated, except within the 14-day money-back guarantee period for one-time customers.
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
            <p>© 2025 Wedding Waitress. All rights reserved.</p>
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
