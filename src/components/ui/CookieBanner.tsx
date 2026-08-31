/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cookie, ShieldCheck, Settings2, CircleCheck, BarChart3, Megaphone, Save, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

const COOKIE_CONSENT_KEY = 'cookie_consent';

type ConsentMode = 'all' | 'essential' | 'custom';

interface ConsentRecord {
  mode: ConsentMode;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  date: string;
}

const applyConsent = (consent: ConsentRecord) => {
  const w = window as any;
  // Google Consent Mode v2
  if (typeof w.gtag === 'function') {
    w.gtag('consent', 'update', {
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
      analytics_storage: consent.analytics ? 'granted' : 'denied',
    });
  }
  // Meta Pixel — only load if marketing consent is granted
  if (consent.marketing && !w.fbq) {
    // Placeholder loader: real Pixel ID can be added here when configured
    // (function(f,b,e,v,n,t,s){...})(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
  }
};

const saveConsent = (consent: ConsentRecord) => {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  applyConsent(consent);
};

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    saveConsent({
      mode: 'all',
      necessary: true,
      analytics: true,
      marketing: true,
      date: new Date().toISOString(),
    });
    setVisible(false);
  };

  const handleOpenPreferences = () => {
    // Pre-fill from any existing stored consent
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (stored) {
        const c = JSON.parse(stored) as ConsentRecord;
        setAnalytics(!!c.analytics);
        setMarketing(!!c.marketing);
      }
    } catch {}
    setPrefsOpen(true);
  };

  const handleSavePreferences = () => {
    saveConsent({
      mode: 'custom',
      necessary: true,
      analytics,
      marketing,
      date: new Date().toISOString(),
    });
    setPrefsOpen(false);
    setVisible(false);
  };

  return (
    <>
      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.12)] border border-border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie size={24} strokeWidth={1.8} aria-hidden="true" className="text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground text-sm mb-1">We use cookies</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We use cookies to improve your experience, analyse traffic, and personalise content. You can accept or manage your preferences.{' '}
                  <Link to="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
                  {' · '}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPreferences}
                className="flex-1 sm:flex-none rounded-xl text-xs"
              >
                <Settings2 size={16} strokeWidth={1.8} aria-hidden="true" className="mr-1.5 shrink-0" />
                Manage Preferences
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="ww-button-espresso flex-1 sm:flex-none rounded-xl text-xs"
              >
                <CircleCheck size={16} strokeWidth={1.8} aria-hidden="true" className="mr-1.5 shrink-0" />
                Accept All
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck size={20} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-primary" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Choose which cookies you want to allow. You can change these at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShieldCheck size={17} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-primary" />
                  Necessary Cookies
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Required for the site to function. Always enabled.
                </p>
              </div>
              <Switch checked disabled />
            </div>

            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <BarChart3 size={17} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-primary" />
                  Analytics Cookies
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Help us understand how visitors use the site.
                </p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} />
            </div>

            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Megaphone size={17} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-primary" />
                  Marketing Cookies
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Used to deliver relevant ads and measure campaigns.
                </p>
              </div>
              <Switch checked={marketing} onCheckedChange={setMarketing} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                saveConsent({
                  mode: 'essential',
                  necessary: true,
                  analytics: false,
                  marketing: false,
                  date: new Date().toISOString(),
                });
                setPrefsOpen(false);
                setVisible(false);
              }}
              className="rounded-xl"
            >
              <Ban size={16} strokeWidth={1.8} aria-hidden="true" className="mr-1.5 shrink-0" />
              Reject All
            </Button>
            <Button
              onClick={handleSavePreferences}
              className="ww-button-espresso rounded-xl"
            >
              <Save size={16} strokeWidth={1.8} aria-hidden="true" className="mr-1.5 shrink-0" />
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
