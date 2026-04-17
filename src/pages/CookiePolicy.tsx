import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Cookie } from 'lucide-react';
import { SeoHead } from '@/components/SEO/SeoHead';

export const CookiePolicy = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <SeoHead
        title="Cookie Policy | Wedding Waitress"
        description="Understand how Wedding Waitress uses cookies and similar technologies to improve your wedding planning experience."
      />
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Cookie className="w-6 h-6 text-primary" />
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
                <Cookie className="w-12 h-12 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">Cookie Policy</CardTitle>
              <p className="text-muted-foreground mt-2">
                Last Updated: 15 April {currentYear}
              </p>
            </CardHeader>

            <CardContent className="prose prose-gray max-w-none pt-8 space-y-8">
              {/* Section 1 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">1. What Are Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cookies are small text files stored on your device when you visit our website. They help improve your experience, enable functionality, and provide insights into how our platform is used.
                </p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">2. How We Use Cookies</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">We use cookies to:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Enable essential website functionality (login, session management)</li>
                  <li>Improve performance and user experience</li>
                  <li>Analyse usage and traffic patterns</li>
                  <li>Support marketing and advertising efforts</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">3. Types of Cookies We Use</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Essential Cookies</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Required for core platform functionality such as login and account access.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Performance & Analytics Cookies</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Help us understand how users interact with the platform (e.g. Google Analytics).
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Functional Cookies</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Remember your preferences and settings.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Marketing Cookies</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Used to deliver relevant advertising and track campaign performance.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">4. Third-Party Cookies</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We may use trusted third-party services such as:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Google Analytics</li>
                  <li>Meta (Facebook Pixel)</li>
                  <li>Stripe (for payments)</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  These providers may place cookies to process data on our behalf.
                </p>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">5. Managing Cookies</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  You can control or disable cookies through your browser settings.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Please note: Disabling cookies may affect functionality and limit your experience on the platform.
                </p>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">6. Consent</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By using Wedding Waitress, you consent to the use of cookies as described in this policy.
                </p>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">7. Updates to This Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Cookie Policy from time to time. Changes will be posted on this page.
                </p>
              </section>

              {/* Section 8 */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">8. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  If you have any questions, contact:
                </p>
                <div className="text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground">Wedding Waitress</p>
                  <p>Melbourne, Victoria, Australia</p>
                  <p>
                    <a href="mailto:support@weddingwaitress.com" className="text-primary hover:underline">
                      support@weddingwaitress.com
                    </a>
                  </p>
                </div>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-8">
        <div className="w-full px-4 text-center text-muted-foreground text-sm">
          <p>© {currentYear} Wedding Waitress. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
