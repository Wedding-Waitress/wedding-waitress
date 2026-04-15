import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'ww_cookie_consent';

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ accepted: true, preferences: 'all', date: new Date().toISOString() }));
    setVisible(false);
  };

  const handleManagePreferences = () => {
    // For now, treat as accept essential only
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ accepted: true, preferences: 'essential', date: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.12)] border border-border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="w-6 h-6 text-primary shrink-0 mt-0.5" />
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
            onClick={handleManagePreferences}
            className="flex-1 sm:flex-none rounded-xl text-xs"
          >
            Manage Preferences
          </Button>
          <Button
            size="sm"
            onClick={handleAcceptAll}
            className="flex-1 sm:flex-none rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
          >
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
};
