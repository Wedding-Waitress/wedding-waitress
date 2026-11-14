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
import { ArrowLeft, FileText } from 'lucide-react';
import { SeoHead } from '@/components/SEO/SeoHead';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { PublicPageHero } from '@/components/Layout/PublicPageHero';
import { publicHeroForRoute } from '@/config/publicHeroManifest';
import '@/styles/PublicSite.css';
import { publicProducts } from '@/content/publicProducts';
import { PUBLIC_COUPLE_PLAN_DETAILS } from '@/components/Pricing/pricingPlans';
import { gstInclusiveAud } from '@/lib/packagePricing';

export const TermsOfService = () => {

  return (
    <div className="ww-public min-h-screen bg-gradient-subtle">
      <SeoHead
        title="Terms of Service | Wedding Waitress"
        description="Read the Terms of Service for Wedding Waitress, the all-in-one wedding planning app for managing guests, seating, and RSVPs."
      />
      <Header />
      <PublicPageHero compact asset={publicHeroForRoute('/terms')} eyebrow="Terms" title="Terms of Service" description="The terms that apply when you use Wedding Waitress products and services." />

      {/* Main Content */}
      <main className="w-full px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="ww-box">
          <CardHeader className="text-center border-b pb-6">
            <div className="flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold"><PublicCopy text={"Terms of Service"} /></CardTitle>
            <p className="text-muted-foreground mt-2"><PublicCopy text={"Last updated: 22 October 2026"} />
            </p>
          </CardHeader>

          <CardContent className="prose prose-sm max-w-none p-8 space-y-6" style={{ overflowWrap: 'anywhere' }}>
            {/* Table of Contents */}
            <div className="bg-muted/50 rounded-lg p-6 not-prose">
              <h3 className="font-semibold text-lg mb-4"><PublicCopy text={"Table of Contents"} /></h3>
              <ol className="space-y-2 text-sm">
                <li><a href="#agreement" className="text-primary hover:underline"><PublicCopy text={"1. Agreement to Terms"} /></a></li>
                <li><a href="#services" className="text-primary hover:underline"><PublicCopy text={"2. Description of Services"} /></a></li>
                <li><a href="#pricing" className="text-primary hover:underline"><PublicCopy text={"3. Plans & Pricing"} /></a></li>
                <li><a href="#account" className="text-primary hover:underline"><PublicCopy text={"4. Account Registration"} /></a></li>
                <li><a href="#acceptable-use" className="text-primary hover:underline"><PublicCopy text={"5. Acceptable Use"} /></a></li>
                <li><a href="#user-content" className="text-primary hover:underline"><PublicCopy text={"6. User Content and Data"} /></a></li>
                <li><a href="#payment" className="text-primary hover:underline"><PublicCopy text={"7. Payment Terms"} /></a></li>
                <li><a href="#refunds" className="text-primary hover:underline"><PublicCopy text={"8. Refund Policy"} /></a></li>
                <li><a href="#cancellation" className="text-primary hover:underline"><PublicCopy text={"9. Cancellation Policy"} /></a></li>
                <li><a href="#intellectual-property" className="text-primary hover:underline"><PublicCopy text={"10. Intellectual Property"} /></a></li>
                <li><a href="#disclaimers" className="text-primary hover:underline"><PublicCopy text={"11. Service availability and data risks"} /></a></li>
                <li><a href="#limitation" className="text-primary hover:underline"><PublicCopy text={"12. Limitation of Liability"} /></a></li>
                <li><a href="#indemnification" className="text-primary hover:underline"><PublicCopy text={"13. Indemnification"} /></a></li>
                <li><a href="#termination" className="text-primary hover:underline"><PublicCopy text={"14. Termination"} /></a></li>
                <li><a href="#governing-law" className="text-primary hover:underline"><PublicCopy text={"15. Governing Law"} /></a></li>
                <li><a href="#changes" className="text-primary hover:underline"><PublicCopy text={"16. Changes to Terms"} /></a></li>
                <li><a href="#contact" className="text-primary hover:underline"><PublicCopy text={"17. Contact Information"} /></a></li>
              </ol>
            </div>

            {/* Content Sections */}
            <section id="agreement">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"1. Agreement to Terms"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"By accessing or using Wedding Waitress (\"Service\", \"Platform\", \"we\", \"us\", \"our\"), you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree to these Terms, you may not use our Service."} /></p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong><PublicCopy text={"Wedding Waitress"} /></strong><br /><PublicCopy text={"ABN: 60 418 261 323"} /><br /><PublicCopy text={"Location: Melbourne, Victoria, Australia"} /><br /><PublicCopy text={"Email: support@weddingwaitress.com.au"} /></p>
            </section>

            <section id="services">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"2. Description of Services"} /></h2>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"Wedding Waitress provides a comprehensive wedding and event management platform including:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">{publicProducts.map(product => <li key={product.id}><PublicCopy text={product.name} /></li>)}</ul>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"We reserve the right to modify, suspend, or discontinue any feature at any time without prior notice."} /></p>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"Any change, suspension or discontinuation is subject to Section 12 and your non-excludable legal rights."} /></p>
            </section>

            <section id="pricing">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"3. Plans & Pricing"} /></h2>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"Wedding Waitress offers one-time payment plans that provide access to the platform for a fixed period."} /></p>

              <h3 className="text-xl font-semibold text-foreground mb-3"><PublicCopy text={"A. For Wedding Couples & Event Organisers (One-Time Purchase)"} /></h3>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"Wedding Waitress offers one-time payment plans that provide access to the platform for a fixed period."} /></p>
              
              <div className="bg-muted/50 rounded-lg p-6 space-y-4 not-prose">
                <div>
                  <h4 className="font-bold text-foreground mb-2"><PublicCopy text={"7-day free trial"} /></h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li><PublicCopy text={"7-day free trial"} /></li>
                    <li><PublicCopy text={"Up to 20 guests"} /></li>
                    <li><PublicCopy text={"Full access to platform features during trial"} /></li>
                    <li><PublicCopy text={"Upgrade required after trial ends to continue use"} /></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-2"><PublicCopy text={"2. Essential Plan"} /></h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li><PublicCopy text={"One-time payment"} /></li>
                    <li><PublicCopy text={"Up to 100 guests"} /></li>
                    <li><PublicCopy text={"Access valid for 12 months"} /></li>
                    <li><PublicCopy text={"Includes full access to all wedding & event planning tools"} /></li>
                    <li><PublicCopy text={"Limited to 1 event"} /></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-2"><PublicCopy text={"3. Premium Plan"} /></h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li><PublicCopy text={"One-time payment"} /></li>
                    <li><PublicCopy text={"Up to 200 guests"} /></li>
                    <li><PublicCopy text={"Access valid for 12 months"} /></li>
                    <li><PublicCopy text={"Includes full access to all wedding & event planning tools"} /></li>
                    <li><PublicCopy text={"Limited to 1 event"} /></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-2"><PublicCopy text={"4. Ultimate Plan"} /></h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li><PublicCopy text={"One-time payment"} /></li>
                    <li><PublicCopy text={"Up to 400 guests"} /></li>
                    <li><PublicCopy text={"Access valid for 12 months"} /></li>
                    <li><PublicCopy text={"Includes full access to all wedding & event planning tools"} /></li>
                    <li><PublicCopy text={"Limited to 1 event"} /></li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-bold text-foreground mb-2"><PublicCopy text={"Plan Expiry & Recovery Period"} /></h4>
                  <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                    <li><PublicCopy text={"Paid packages provide 12 months of access from their confirmed term start; a promotional package purchased during the free trial starts after that trial ends"} /></li>
                    <li><PublicCopy text={"Planning, data and download access ends when the paid access period expires"} /></li>
                    <li><PublicCopy text={"Expiry alone does not automatically delete your saved account or event content"} /></li>
                    <li><PublicCopy text={"Account recovery: 6 months after access ends."} /></li>
                    <li><PublicCopy text={"Wedding Waitress reserves the right to modify plan limits, pricing, or features at any time, with reasonable notice to users"} /></li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"B. RSVP Email & SMS Credits"} /></h3>
              <p className="text-muted-foreground leading-relaxed mb-2"><PublicCopy text={"Paid wedding plans include a shared allowance for RSVP email and SMS delivery."} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><PublicCopy text={"Essential includes 150 credits, Premium includes 250 credits, and Ultimate includes 450 credits"} /></li>
                <li><PublicCopy text={"Each successfully delivered RSVP email or SMS uses one credit"} /></li>
                <li><PublicCopy text={"Top up with 10 shared credits for A$11 or 100 for A$53.90, including 10% GST."} /></li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"Plan Expiry & Recovery Period"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Each couple plan covers one event and provides exactly 12 months of active planning access. You can extend for one month or any number of whole months at A$22 per month, paid upfront. Includes 10% GST worldwide."} /></p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"Promotional Codes"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"We may offer promotional codes or discounts from time to time. These codes:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li><PublicCopy text={"Must be applied at checkout"} /></li>
                <li><PublicCopy text={"Cannot be combined with other offers unless explicitly stated"} /></li>
                <li><PublicCopy text={"Have expiration dates and usage limits"} /></li>
                <li><PublicCopy text={"Are non-transferable and have no cash value"} /></li>
              </ul>
            </section>

            <section id="account">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"4. Account Registration"} /></h2>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"To use Wedding Waitress, you must create an account. You agree to:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><PublicCopy text={"Provide accurate and complete registration information"} /></li>
                <li><PublicCopy text={"Maintain the security of your password and account"} /></li>
                <li><PublicCopy text={"Notify us immediately of any unauthorized access"} /></li>
                <li><PublicCopy text={"Accept responsibility for all activities under your account"} /></li>
                <li><PublicCopy text={"Be at least 18 years of age"} /></li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"We reserve the right to suspend or terminate accounts that violate these Terms or are suspected of fraudulent activity."} /></p>
            </section>

            <section id="acceptable-use">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"5. Acceptable Use"} /></h2>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"You agree NOT to use the Service to:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><PublicCopy text={"Violate any laws or regulations"} /></li>
                <li><PublicCopy text={"Infringe on intellectual property rights"} /></li>
                <li><PublicCopy text={"Upload malicious code, viruses, or harmful content"} /></li>
                <li><PublicCopy text={"Harass, abuse, or harm other users"} /></li>
                <li><PublicCopy text={"Attempt to gain unauthorized access to our systems"} /></li>
                <li><PublicCopy text={"Scrape or extract data without permission"} /></li>
                <li><PublicCopy text={"Resell or redistribute our services without authorization"} /></li>
                <li><PublicCopy text={"Use the Service for spam or unsolicited marketing"} /></li>
              </ul>
            </section>

            <section id="user-content">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"6. User Content and Data"} /></h2>
              <h3 className="text-xl font-semibold text-foreground mb-3"><PublicCopy text={"6.1 Your Content"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"You retain ownership of all content you upload to Wedding Waitress (guest lists, event details, images, etc.). By uploading content, you grant us a limited license to:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li><PublicCopy text={"Store and display your content to provide the Service"} /></li>
                <li><PublicCopy text={"Process your content to generate QR codes, seating charts, and printables"} /></li>
                <li><PublicCopy text={"Back up your content for disaster recovery"} /></li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"6.2 Responsibility for Content"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"You are solely responsible for your content and ensure that:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li><PublicCopy text={"You have the right to share guest information"} /></li>
                <li><PublicCopy text={"Your content does not violate privacy laws or regulations"} /></li>
                <li><PublicCopy text={"Your content does not infringe on third-party rights"} /></li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"6.3 Keeping copies of your data"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Keep independent copies of important information and original photos and videos. Download available exports before your access ends, and keep an offline copy of essential plans for your event day. These precautions do not reduce our legal responsibilities or your consumer rights. Account access, retention and deletion remain governed by the applicable plan terms and Privacy Policy."} /></p>
            </section>

            <section id="payment">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"7. Payment Terms"} /></h2>
              <h3 className="text-xl font-semibold text-foreground mb-3"><PublicCopy text={"7.1 Payment Processing"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"All payments are processed securely through Stripe, a PCI-DSS compliant payment processor. We do not store your credit card information on our servers."} /></p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"7.2 Plan Access"} /></h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><PublicCopy text={"One-time payment"} />: {Object.values(PUBLIC_COUPLE_PLAN_DETAILS).map((plan,index) => <React.Fragment key={plan.name}>{index > 0 ? ', ' : ''}<PublicCopy text={plan.name} /> <bdi dir="ltr">A${gstInclusiveAud(plan.priceAud).toFixed(2)}</bdi></React.Fragment>)}</li>
                <li><PublicCopy text={"One event for 12 months"} /></li>
                <li><PublicCopy text={"Prices are in AUD and include 10% GST worldwide. Discounts apply before GST."} /></li>
                <li><PublicCopy text={"Access is activated after successful payment verification."} /></li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"7.3 Failed Payments"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"If payment fails, no purchase is activated. Check your payment details before trying checkout again."} /></p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"7.4 Price Changes"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"We reserve the right to change our pricing at any time. For existing customers:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li><PublicCopy text={"One-time purchases are honored at the original price"} /></li>
              </ul>
            </section>

            <section id="refunds">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"8. Refund Policy"} /></h2>
              <h3 className="text-xl font-semibold text-foreground mb-3"><PublicCopy text={"8.1 Free Trials"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Free trials are risk-free. No payment is required during the trial period."} /></p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"8.2 One-Time Purchases (Wedding Couples)"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Paid plans are generally non-refundable once activated if you simply change your mind."} /></p>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"This does not affect any refund, cancellation, compensation or other remedy you are entitled to under the Australian Consumer Law or other applicable law."} /></p>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"For help with payment errors or service failures, contact support@weddingwaitress.com.au."} /></p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"8.4 Add-ons"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Add-on purchases, including RSVP credit bundles and plan extensions, are generally non-refundable once activated if you simply change your mind."} /></p>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"This does not affect any refund, cancellation, compensation or other remedy you are entitled to under the Australian Consumer Law or other applicable law."} /></p>
            </section>

            <section id="cancellation">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"9. Cancellation Policy"} /></h2>
              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"9.2 Account Deletion"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"To permanently delete your account:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li><PublicCopy text={"Email support@weddingwaitress.com.au to request account deletion"} /></li>
                <li><PublicCopy text={"Account closure and data retention follow the Privacy Policy and the recovery information shown in your account."} /></li>
                <li><PublicCopy text={"This action cannot be undone"} /></li>
              </ul>
            </section>

            <section id="intellectual-property">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"10. Intellectual Property"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Wedding Waitress and all associated content, features, and functionality are owned by Wedding Waitress (ABN 60 418 261 323) and are protected by international copyright, trademark, and other intellectual property laws."} /></p>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"You may not:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li><PublicCopy text={"Copy, modify, or distribute our software or content"} /></li>
                <li><PublicCopy text={"Reverse engineer or decompile our code"} /></li>
                <li><PublicCopy text={"Remove copyright notices or branding"} /></li>
                <li><PublicCopy text={"Use our trademarks without permission"} /></li>
              </ul>
            </section>

            <section id="disclaimers">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"11. Service availability and data risks"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"We take reasonable care and skill in providing Wedding Waitress. However, online services can experience outages, delays, errors and other technical problems, including problems involving internet connections and service providers. We cannot promise continuous or error-free operation."} /></p>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"Information entered or uploaded to the platform may become unavailable, corrupted, lost or deleted. We cannot promise that every lost or deleted item can be restored. This does not change our stated retention and deletion commitments or your rights under Section 12."} /></p>
            </section>

            <section id="limitation">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"12. Limitation of Liability"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"These Terms do not take away any guarantees, rights or remedies that cannot lawfully be excluded, including those under the Australian Consumer Law. Where applicable, these include rights to have a service failure remedied, receive a refund, cancel a service, or obtain compensation for reasonably foreseeable loss or damage."} /></p>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"For liability that may lawfully be limited, we are not responsible for loss that was not reasonably foreseeable when the contract was made, or loss caused solely by circumstances outside our reasonable control, provided we used reasonable care and skill and took reasonable steps to prevent or reduce that loss. This limitation does not cover our fraud, wilful misconduct, or any responsibility the law does not allow us to exclude."} /></p>
            </section>

            <section id="indemnification">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"13. Indemnification"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"You agree to indemnify and hold harmless Wedding Waitress, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li><PublicCopy text={"Your violation of these Terms"} /></li>
                <li><PublicCopy text={"Your violation of any laws or third-party rights"} /></li>
                <li><PublicCopy text={"Your content or use of the Service"} /></li>
                <li><PublicCopy text={"Your negligence or misconduct"} /></li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"This section is subject to Section 12 and does not require you to cover loss caused by our own negligence, fraud, wilful misconduct, or breach of these Terms or applicable law."} /></p>
            </section>

            <section id="termination">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"14. Termination"} /></h2>
              <h3 className="text-xl font-semibold text-foreground mb-3"><PublicCopy text={"14.1 Termination by You"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Account closure and data retention follow the Privacy Policy and the recovery information shown in your account."} /></p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"14.2 Termination by Us"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"We may suspend or terminate your account if:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li><PublicCopy text={"You violate these Terms"} /></li>
                <li><PublicCopy text={"Your account is involved in fraudulent activity"} /></li>
                <li><PublicCopy text={"You fail to pay required fees"} /></li>
                <li><PublicCopy text={"We are required to do so by law"} /></li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6"><PublicCopy text={"14.3 Effect of Termination"} /></h3>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Upon termination:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-2">
                <li><PublicCopy text={"Your access to the Service will be immediately revoked"} /></li>
                <li><PublicCopy text={"Account closure and data retention follow the Privacy Policy and the recovery information shown in your account."} /></li>
                <li><PublicCopy text={"Sections of these Terms that should survive will remain in effect"} /></li>
              </ul>
            </section>

            <section id="governing-law">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"15. Governing Law"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"These Terms are governed by the laws of Victoria, Australia. Any disputes will be resolved in the courts of Victoria, Australia. You agree to submit to the exclusive jurisdiction of these courts."} /></p>
            </section>

            <section id="changes">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"16. Changes to Terms"} /></h2>
              <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"We may update these Terms from time to time. We will notify you of significant changes by:"} /></p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li><PublicCopy text={"Posting the updated Terms on this page with a new \"Last Updated\" date"} /></li>
                <li><PublicCopy text={"Sending an email notification to your registered email"} /></li>
                <li><PublicCopy text={"Displaying a notice in your dashboard"} /></li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4"><PublicCopy text={"Your continued use of Wedding Waitress after changes take effect constitutes acceptance of the updated Terms. If you do not agree to the new Terms, you must stop using the Service and cancel your account."} /></p>
            </section>

            <section id="contact">
              <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"17. Contact Information"} /></h2>
              <p className="text-muted-foreground leading-relaxed mb-4"><PublicCopy text={"If you have questions or concerns about these Terms of Service, please contact us:"} /></p>
              <div className="bg-muted/50 rounded-lg p-6 not-prose">
                <p className="font-semibold text-foreground mb-2"><PublicCopy text={"Wedding Waitress"} /></p>
                <p className="text-muted-foreground text-sm"><PublicCopy text={"ABN: 60 418 261 323"} /></p>
                <p className="text-muted-foreground text-sm"><PublicCopy text={"Melbourne, Victoria, Australia"} /></p>
                <p className="text-muted-foreground text-sm mt-4"><PublicCopy text={"Email: "} /><a href="mailto:support@weddingwaitress.com.au" className="text-primary hover:underline"><PublicCopy text={"support@weddingwaitress.com.au"} /></a>
                </p>
              </div>
            </section>

            {/* Acknowledgment */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 not-prose">
              <p className="text-sm text-foreground">
                <strong><PublicCopy text={"ACKNOWLEDGMENT:"} /></strong><PublicCopy text={" By using Wedding Waitress, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy."} /></p>
            </div>

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

