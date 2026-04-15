import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';

export const PrivacyPolicy = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-primary" />
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
              <Shield className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
            <p className="text-muted-foreground mt-2">
              Last Updated: 15 April {currentYear}
            </p>
          </CardHeader>

          <CardContent className="prose prose-sm max-w-none p-8 space-y-6">
            {/* Table of Contents */}
            <div className="bg-muted/50 rounded-lg p-6 not-prose">
              <h3 className="font-semibold text-lg mb-4">Table of Contents</h3>
              <ol className="space-y-2 text-sm">
                <li><a href="#introduction" className="text-primary hover:underline">1. Introduction</a></li>
                <li><a href="#information-we-collect" className="text-primary hover:underline">2. Information We Collect</a></li>
                <li><a href="#how-we-use" className="text-primary hover:underline">3. How We Use Your Information</a></li>
                <li><a href="#data-sharing" className="text-primary hover:underline">4. Data Sharing and Disclosure</a></li>
                <li><a href="#data-security" className="text-primary hover:underline">5. Data Security</a></li>
                <li><a href="#your-rights" className="text-primary hover:underline">6. Your Rights</a></li>
                <li><a href="#cookies" className="text-primary hover:underline">7. Cookies and Tracking</a></li>
                <li><a href="#data-retention" className="text-primary hover:underline">8. Data Retention</a></li>
                <li><a href="#international-users" className="text-primary hover:underline">9. International Users</a></li>
                <li><a href="#childrens-privacy" className="text-primary hover:underline">10. Children's Privacy</a></li>
                <li><a href="#changes" className="text-primary hover:underline">11. Changes to This Policy</a></li>
                <li><a href="#contact" className="text-primary hover:underline">12. Contact Us</a></li>
              </ol>
            </div>

            {/* Content Sections */}
            <section id="introduction">
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to Wedding Waitress. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our wedding and event management platform.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong>Wedding Waitress</strong><br />
                ABN: 60 418 261 323<br />
                Location: Melbourne, Victoria, Australia<br />
                Email: support@weddingwaitress.com
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                By using Wedding Waitress, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
              </p>
            </section>

            <section id="information-we-collect">
              <h2 className="text-2xl font-bold text-foreground mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-3">2.1 Personal Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Account Information:</strong> First name, last name, email address, mobile number, password</li>
                <li><strong>Event Information:</strong> Event names, dates, locations, guest lists, seating arrangements</li>
                <li><strong>Guest Information:</strong> Names, email addresses, dietary requirements, table assignments, RSVP status</li>
                <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store credit card details)</li>
                <li><strong>Profile Information:</strong> Display names, preferences, subscription details</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.2 Information Automatically Collected</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns</li>
                <li><strong>Device Information:</strong> Browser type, operating system, device identifiers, IP address</li>
                <li><strong>Location Data:</strong> Approximate location based on IP address</li>
                <li><strong>Cookies and Tracking:</strong> Session cookies, preference cookies, analytics cookies</li>
              </ul>
            </section>

            <section id="how-we-use">
              <h2 className="text-2xl font-bold text-foreground mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Service Delivery:</strong> To provide, maintain, and improve our wedding and event management services</li>
                <li><strong>Account Management:</strong> To create and manage your account, authenticate your identity</li>
                <li><strong>Event Management:</strong> To help you organize guests, seating charts, QR codes, and event materials</li>
                <li><strong>Communication:</strong> To send you service updates, technical notices, support messages</li>
                <li><strong>Payment Processing:</strong> We process payments securely via Stripe. Wedding Waitress does not store credit card details. Wedding plans are one-time purchases, while Vendor Pro is a recurring subscription billed monthly. Stripe processes payments on our behalf in accordance with their privacy policy.</li>
                <li><strong>Analytics:</strong> To understand how our services are used and improve user experience</li>
                <li><strong>Marketing:</strong> To send promotional emails and updates about Wedding Waitress. You may opt out of marketing communications at any time by clicking "unsubscribe" or contacting us directly.</li>
                <li><strong>Legal Compliance:</strong> To comply with legal obligations and enforce our terms</li>
              </ul>
            </section>

            <section id="data-sharing">
              <h2 className="text-2xl font-bold text-foreground mb-4">4. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We do not sell your personal information. We may share your data with trusted third-party providers who assist us in operating the platform.
              </p>
              
              <h3 className="text-xl font-semibold text-foreground mb-3">4.1 Service Providers</h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Supabase:</strong> Database hosting and authentication services</li>
                <li><strong>Stripe:</strong> Payment processing (PCI-DSS compliant)</li>
                <li><strong>Cloud Storage:</strong> For storing event materials and QR codes</li>
                <li><strong>Email Services:</strong> For sending notifications and verification emails</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                These providers process data on our behalf and are contractually obligated to protect your information.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">4.2 Legal Requirements</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may disclose your information if required by law, court order, or government request, or to protect our rights, safety, or property.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">4.3 Business Transfers</h3>
              <p className="text-muted-foreground leading-relaxed">
                If Wedding Waitress is involved in a merger, acquisition, or asset sale, your information may be transferred as part of that transaction.
              </p>
            </section>

            <section id="data-security">
              <h2 className="text-2xl font-bold text-foreground mb-4">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Encryption:</strong> All data transmitted via HTTPS/TLS encryption</li>
                <li><strong>Authentication:</strong> Secure password hashing and email verification</li>
                <li><strong>Access Controls:</strong> Row-level security policies in our database</li>
                <li><strong>Payment Security:</strong> PCI-DSS compliant payment processing via Stripe</li>
                <li><strong>Regular Audits:</strong> Security assessments and vulnerability testing</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section id="your-rights">
              <h2 className="text-2xl font-bold text-foreground mb-4">6. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Under Australian Privacy Law and, where applicable, GDPR or other international data protection laws, you may have the following rights:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and personal data</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, email us at <a href="mailto:support@weddingwaitress.com" className="text-primary hover:underline">support@weddingwaitress.com</a>. We will respond within 30 days.
              </p>
            </section>

            <section id="cookies">
              <h2 className="text-2xl font-bold text-foreground mb-4">7. Cookies and Tracking</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use cookies and similar tracking technologies to improve your experience:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Essential Cookies:</strong> Required for authentication and core functionality</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Analytics Cookies:</strong> Help us understand usage patterns</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You can control cookies through your browser settings. Note that disabling certain cookies may affect service functionality.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                By using our website, you consent to the use of cookies. You may control or disable cookies through your browser settings. Disabling cookies may affect certain features of the platform.
              </p>
            </section>

            <section id="data-retention">
              <h2 className="text-2xl font-bold text-foreground mb-4">8. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide services. After account deletion, we may retain certain information for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>Legal compliance and tax purposes (up to 7 years)</li>
                <li>Fraud prevention and security</li>
                <li>Resolving disputes</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You can request immediate deletion of your data by contacting support, subject to legal obligations.
              </p>
            </section>

            <section id="international-users">
              <h2 className="text-2xl font-bold text-foreground mb-4">9. International Users</h2>
              <p className="text-muted-foreground leading-relaxed">
                Wedding Waitress is accessible globally. By using our platform, you acknowledge that your data may be processed and stored in servers located outside your country, including Australia. We take reasonable steps to ensure your data is handled securely and in accordance with this policy.
              </p>
            </section>

            <section id="childrens-privacy">
              <h2 className="text-2xl font-bold text-foreground mb-4">10. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Wedding Waitress is not intended for children under 18. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section id="changes">
              <h2 className="text-2xl font-bold text-foreground mb-4">11. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>Posting the updated policy on this page with a new "Last Updated" date</li>
                <li>Sending an email notification to your registered email address</li>
                <li>Displaying a notice in your dashboard</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Your continued use of Wedding Waitress after changes take effect constitutes acceptance of the updated policy.
              </p>
            </section>

            <section id="contact">
              <h2 className="text-2xl font-bold text-foreground mb-4">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have questions or concerns about this Privacy Policy, please contact us:
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
