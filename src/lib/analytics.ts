// Analytics utility for Who Is functionality
// Ensures no PII is included beyond IDs and enums

// Feature flags removed

export interface AnalyticsEvent {
  name: string;
  properties: Record<string, any>;
}

// Guard function to prevent analytics for disabled features
const shouldTrack = (_eventName: string): boolean => {
  return true;
};

export const analytics = {
  track: (eventName: string, properties: Record<string, any> = {}) => {
    // Check if feature is enabled before tracking
    if (!shouldTrack(eventName)) return;
    
    // Send to analytics service in production
    // In development, you can temporarily enable console logging for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`Analytics: ${eventName}`, properties);
    }
    
    // Here you would typically send to your analytics service
    // e.g., mixpanel.track(eventName, properties);
    // or gtag('event', eventName, properties);
  }
};

// Who Is specific analytics events
export const whoIsAnalytics = {
  partnerNamesSet: (eventId: string) => {
    analytics.track('whois.partner_names_set', { event_id: eventId });
  },

  addGuestBlockedMissingNames: (eventId: string) => {
    analytics.track('whois.addguest_blocked_missing_names', { event_id: eventId });
  },

  selectionMade: (eventId: string, guestId: string, partner: 'partner_one' | 'partner_two', role: string) => {
    analytics.track('whois.selection_made', { 
      event_id: eventId, 
      guest_id: guestId, 
      partner, 
      role 
    });
  },

  tableFilterUsed: (eventId: string, partner?: string, role?: string) => {
    analytics.track('whois.table_filter_used', { 
      event_id: eventId, 
      partner, 
      role 
    });
  },

  importStarted: (eventId: string, rows: number) => {
    analytics.track('whois.import_started', { event_id: eventId, rows });
  },

  importCompleted: (eventId: string, inserted: number, skipped: number) => {
    analytics.track('whois.import_completed', { event_id: eventId, inserted, skipped });
  }
};
