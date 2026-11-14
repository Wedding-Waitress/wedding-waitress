import { PublicCopy } from '@/i18n/PublicCopy';
import { usePublicCopy } from '@/i18n/usePublicCopy';
/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Cookie } from 'lucide-react';
import { SeoHead } from '@/components/SEO/SeoHead';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { PublicPageHero } from '@/components/Layout/PublicPageHero';
import { publicHeroForRoute } from '@/config/publicHeroManifest';
import '@/styles/PublicSite.css';

export const CookiePolicy = () => {
  const copy = usePublicCopy();
  const currentYear = new Date().getFullYear();

  return (
    <div className="ww-public min-h-screen bg-gradient-subtle">
      <SeoHead
        title={`${copy('Cookie Policy')} | Wedding Waitress`}
        description={copy('Understand how Wedding Waitress uses cookies and similar technologies to improve your wedding planning experience.')}
      />
      <Header />
      <PublicPageHero compact asset={publicHeroForRoute('/cookies')} eyebrow="Cookies" title="Cookie Policy" description="How Wedding Waitress uses cookies and similar technologies across the public website and platform." />

      {/* Main Content */}
      <main className="w-full px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="ww-box">
            <CardHeader className="text-center border-b pb-6">
              <div className="flex items-center justify-center mb-4">
                <Cookie className="w-12 h-12 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold"><PublicCopy text={"Cookie Policy"} /></CardTitle>
              <p className="text-muted-foreground mt-2"><PublicCopy text={"Last Updated: 15 April "} />{currentYear}
              </p>
            </CardHeader>

            <CardContent className="prose prose-gray max-w-none pt-8 space-y-8">
              {/* Section 1 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"1. What Are Cookies"} /></h2>
                <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Cookies are small text files stored on your device when you visit our website. They help improve your experience, enable functionality, and provide insights into how our platform is used."} /></p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"2. How We Use Cookies"} /></h2>
                <p className="text-muted-foreground leading-relaxed mb-3"><PublicCopy text={"We use cookies to:"} /></p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><PublicCopy text={"Enable essential website functionality (login, session management)"} /></li>
                  <li><PublicCopy text={"Improve performance and user experience"} /></li>
                  <li><PublicCopy text={"Analyse usage and traffic patterns"} /></li>
                  <li><PublicCopy text={"Support marketing and advertising efforts"} /></li>
                </ul>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"3. Types of Cookies We Use"} /></h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1"><PublicCopy text={"Essential Cookies"} /></h3>
                    <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Required for core platform functionality such as login and account access."} /></p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1"><PublicCopy text={"Performance & Analytics Cookies"} /></h3>
                    <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Help us understand how users interact with the platform (e.g. Google Analytics)."} /></p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1"><PublicCopy text={"Functional Cookies"} /></h3>
                    <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Remember your preferences and settings."} /></p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1"><PublicCopy text={"Marketing Cookies"} /></h3>
                    <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Used to deliver relevant advertising and track campaign performance."} /></p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"4. Third-Party Cookies"} /></h2>
                <p className="text-muted-foreground leading-relaxed mb-3"><PublicCopy text={"We may use trusted third-party services such as:"} /></p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><PublicCopy text={"Google Analytics"} /></li>
                  <li><PublicCopy text={"Meta (Facebook Pixel)"} /></li>
                  <li><PublicCopy text={"Stripe (for payments)"} /></li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3"><PublicCopy text={"These providers may place cookies to process data on our behalf."} /></p>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"5. Managing Cookies"} /></h2>
                <p className="text-muted-foreground leading-relaxed mb-3"><PublicCopy text={"You can control or disable cookies through your browser settings."} /></p>
                <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"Please note: Disabling cookies may affect functionality and limit your experience on the platform."} /></p>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"6. Consent"} /></h2>
                <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"By using Wedding Waitress, you consent to the use of cookies as described in this policy."} /></p>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"7. Updates to This Policy"} /></h2>
                <p className="text-muted-foreground leading-relaxed"><PublicCopy text={"We may update this Cookie Policy from time to time. Changes will be posted on this page."} /></p>
              </section>

              {/* Section 8 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4"><PublicCopy text={"8. Contact Us"} /></h2>
                <p className="text-muted-foreground leading-relaxed mb-3"><PublicCopy text={"If you have any questions, contact:"} /></p>
                <div className="text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground"><PublicCopy text={"Wedding Waitress"} /></p>
                  <p><PublicCopy text={"Melbourne, Victoria, Australia"} /></p>
                  <p>
                    <a href="mailto:support@weddingwaitress.com.au" className="text-primary hover:underline"><PublicCopy text={"support@weddingwaitress.com.au"} /></a>
                  </p>
                </div>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
