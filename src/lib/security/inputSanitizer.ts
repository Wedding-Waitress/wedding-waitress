// Advanced input sanitization to prevent XSS, injection attacks, and data corruption

// HTML entity encoding map
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;'
};

// Dangerous patterns that should be removed or flagged
const dangerousPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*>/gi,
  /<link\b[^<]*>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:/gi,
  /on\w+\s*=/gi // Event handlers like onclick, onload, etc.
];

export class InputSanitizer {
  
  /**
   * Sanitize text input to prevent XSS attacks
   */
  static sanitizeText(input: string, maxLength: number = 255): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove dangerous patterns first
    let sanitized = input;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Encode HTML entities
    sanitized = sanitized.replace(/[&<>"'\/]/g, char => htmlEntities[char] || char);

    // Trim and limit length
    return sanitized.trim().substring(0, maxLength);
  }

  /**
   * Sanitize name inputs (stricter validation for names)
   */
  static sanitizeName(input: string, maxLength: number = 50): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Allow only letters, spaces, hyphens, apostrophes, and common accented characters
    const namePattern = /[^a-zA-Z\s\-'\.àáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžæ]/g;
    
    return input
      .replace(namePattern, '')
      .trim()
      .substring(0, maxLength);
  }

  /**
   * Sanitize phone numbers
   */
  static sanitizePhone(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Allow only digits, spaces, hyphens, parentheses, and plus sign
    return input.replace(/[^\d\+\-\(\)\s]/g, '').trim();
  }

  /**
   * Sanitize email addresses
   */
  static sanitizeEmail(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Basic email sanitization - remove dangerous characters but preserve valid email chars
    return input
      .toLowerCase()
      .replace(/[^a-z0-9@._\-]/g, '')
      .trim()
      .substring(0, 255);
  }

  /**
   * Sanitize notes and longer text content
   */
  static sanitizeNotes(input: string, maxLength: number = 500): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove script tags and other dangerous HTML
    let sanitized = input;
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REMOVED]');
    });

    // Allow basic formatting but encode dangerous characters
    sanitized = sanitized.replace(/[<>]/g, char => htmlEntities[char] || char);

    // Limit length and trim
    return sanitized.trim().substring(0, maxLength);
  }

  /**
   * Detect potentially malicious input
   */
  static detectMaliciousInput(input: string): boolean {
    if (typeof input !== 'string') {
      return false;
    }

    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
      /url\s*\(/i,
      /@import/i,
      /binding\s*:/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate and sanitize JSON input
   */
  static sanitizeJSON(input: string): any {
    try {
      const parsed = JSON.parse(input);
      
      // Recursively sanitize all string values in the JSON
      const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
          return this.sanitizeText(obj);
        }
        
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        }
        
        if (obj && typeof obj === 'object') {
          const sanitized: any = {};
          for (const [key, value] of Object.entries(obj)) {
            // Sanitize both keys and values
            const sanitizedKey = this.sanitizeText(key, 100);
            sanitized[sanitizedKey] = sanitizeObject(value);
          }
          return sanitized;
        }
        
        return obj;
      };

      return sanitizeObject(parsed);
    } catch {
      return null;
    }
  }

  /**
   * Create a sanitization report for debugging
   */
  static createSanitizationReport(original: string, sanitized: string): {
    wasModified: boolean;
    removedContent: boolean;
    potentiallyMalicious: boolean;
  } {
    return {
      wasModified: original !== sanitized,
      removedContent: sanitized.includes('[REMOVED]'),
      potentiallyMalicious: this.detectMaliciousInput(original)
    };
  }
}

// Convenience functions for common sanitization tasks
export const sanitize = {
  text: (input: string, maxLength?: number) => InputSanitizer.sanitizeText(input, maxLength),
  name: (input: string, maxLength?: number) => InputSanitizer.sanitizeName(input, maxLength),
  phone: (input: string) => InputSanitizer.sanitizePhone(input),
  email: (input: string) => InputSanitizer.sanitizeEmail(input),
  notes: (input: string, maxLength?: number) => InputSanitizer.sanitizeNotes(input, maxLength),
  json: (input: string) => InputSanitizer.sanitizeJSON(input)
};