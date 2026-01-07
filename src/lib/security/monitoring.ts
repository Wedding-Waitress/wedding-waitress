// Security monitoring and audit logging utilities
// Helps track and monitor security-related events and potential threats

interface SecurityEvent {
  type: 'auth' | 'data_access' | 'input_validation' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events in memory

  // Log a security event
  logEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(securityEvent);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log critical events to console for immediate attention
    if (event.severity === 'critical') {
      console.error('CRITICAL SECURITY EVENT:', securityEvent);
    }

    // In a real application, you would send these to a security monitoring service
    this.processSecurityEvent(securityEvent);
  }

  // Process security events (stub for future enhancement)
  private processSecurityEvent(event: SecurityEvent) {
    // Future enhancements could include:
    // - Send to external security monitoring service
    // - Rate limiting based on event patterns
    // - Automatic blocking of suspicious IPs
    // - Email alerts for critical events
  }

  // Get recent security events (for admin dashboard)
  getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  // Check for suspicious patterns
  detectSuspiciousActivity(userId?: string): boolean {
    const recentEvents = this.events.slice(-100);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Check for rapid-fire validation failures
    const recentValidationFailures = recentEvents.filter(
      event => 
        event.type === 'input_validation' &&
        event.severity === 'medium' &&
        event.timestamp > fiveMinutesAgo &&
        (!userId || event.userId === userId)
    );

    return recentValidationFailures.length > 10; // More than 10 failures in 5 minutes
  }
}

// Singleton instance
export const securityMonitor = new SecurityMonitor();

// Helper functions for common security events
export const logSecurityEvent = {
  authFailure: (reason: string = 'Invalid credentials', userId?: string) => {
    securityMonitor.logEvent({
      type: 'auth',
      severity: 'medium',
      message: `Authentication failure: ${reason}`,
      userId,
      metadata: { reason }
    });
  },

  validationFailure: (field: string, value: string, userId?: string) => {
    securityMonitor.logEvent({
      type: 'input_validation',
      severity: 'medium',
      message: `Input validation failed for field: ${field}`,
      userId,
      metadata: { field, value: value.substring(0, 50) } // Truncate sensitive data
    });
  },

  suspiciousDataAccess: (resource: string, reason: string, userId?: string) => {
    securityMonitor.logEvent({
      type: 'suspicious_activity',
      severity: 'high',
      message: `Suspicious data access attempt: ${resource}`,
      userId,
      metadata: { resource, reason }
    });
  },

  privilegeEscalation: (attemptedAction: string, userId?: string) => {
    securityMonitor.logEvent({
      type: 'suspicious_activity',
      severity: 'critical',
      message: `Privilege escalation attempt: ${attemptedAction}`,
      userId,
      metadata: { attemptedAction }
    });
  }
};

// Rate limiting helper
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry || now > entry.resetTime) {
      // First attempt or window expired
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.maxAttempts) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRemainingAttempts(identifier: string): number {
    const entry = this.attempts.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - entry.count);
  }

  getRemainingTime(identifier: string): number {
    const entry = this.attempts.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }
    return Math.max(0, Math.ceil((entry.resetTime - Date.now()) / 1000));
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Global rate limiter instances
export const loginRateLimiter = new RateLimiter(1, 90 * 1000); // 1 attempt per 90 seconds
export const guestAddRateLimiter = new RateLimiter(20, 60 * 1000); // 20 guests per minute
