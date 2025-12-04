import { z } from "zod";

// Security-focused validation schemas with comprehensive input validation
// and sanitization to prevent XSS, injection attacks, and data corruption

// Common validation patterns
const sanitizeString = (str: string) => 
  str.trim().replace(/[<>]/g, '').substring(0, 255);

const phoneRegex = /^[\+]?[0-9][\d]{0,15}$/;
const nameRegex = /^[a-zA-Z\s\-'\.àáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžæ]{1,50}$/;

// Enhanced guest validation schema with security measures
export const secureGuestSchema = z.object({
  first_name: z.string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters")
    .regex(nameRegex, "First name contains invalid characters")
    .transform(sanitizeString),
  
  last_name: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters")
    .regex(nameRegex, "Last name contains invalid characters")
    .transform(sanitizeString),
  
  table_id: z.string()
    .min(1, "Table selection is required")
    .refine(val => val !== "none", "Table selection is required"),
  
  seat_no: z.coerce.number()
    .min(1, "Seat selection is required")
    .max(100, "Invalid seat number"),
  
  rsvp_date: z.date().optional(),
  
  rsvp: z.enum(["Pending", "Attending", "Not Attending"], {
    errorMap: () => ({ message: "Invalid RSVP status" })
  }),
  
  dietary: z.string()
    .max(200, "Dietary requirements must be less than 200 characters")
    .transform(sanitizeString)
    .default("NA"),
  
  mobile: z.string()
    .optional()
    .refine(val => !val || phoneRegex.test(val.replace(/\s/g, "")), 
      "Invalid phone number format")
    .transform(val => val ? val.replace(/\s/g, "") : undefined),
  
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  
  family_group: z.string()
    .max(50, "Family group name must be less than 50 characters")
    .transform(sanitizeString)
    .optional(),
  
  notes: z.string()
    .max(500, "Notes must be less than 500 characters")
    .transform(sanitizeString)
    .optional(),
  
  relation_partner: z.string()
    .min(1, "Please choose one partner and one role")
    .max(50, "Partner selection invalid"),
  
  relation_role: z.string()
    .min(1, "Please choose one partner and one role")
    .max(50, "Role selection invalid"),
});

// Enhanced table validation schema
export const secureTableSchema = z.object({
  name: z.string()
    .min(1, "Table name is required")
    .max(50, "Table name must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_]{1,50}$/, "Table name contains invalid characters")
    .transform(sanitizeString),
  
  limit_seats: z.number()
    .min(1, "Minimum 1 seat required")
    .max(124, "Maximum 124 seats allowed"),
  
  notes: z.string()
    .max(500, "Notes must be less than 500 characters")
    .transform(sanitizeString)
    .optional(),
  
  table_no: z.number()
    .min(1)
    .max(999)
    .optional()
    .nullable(),
  
  table_type: z.enum(['round', 'square', 'long'])
    .optional()
    .nullable()
    .default('round'),
});

// Enhanced email validation for authentication
export const secureEmailSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase()
    .trim()
});

// Event validation schema
export const secureEventSchema = z.object({
  name: z.string()
    .min(1, "Event name is required")
    .max(100, "Event name must be less than 100 characters")
    .transform(sanitizeString),
  
  venue: z.string()
    .max(200, "Venue must be less than 200 characters")
    .transform(sanitizeString)
    .optional(),
  
  partner1_name: z.string()
    .max(50, "Partner name must be less than 50 characters")
    .regex(nameRegex, "Partner name contains invalid characters")
    .transform(sanitizeString)
    .optional(),
  
  partner2_name: z.string()
    .max(50, "Partner name must be less than 50 characters")
    .regex(nameRegex, "Partner name contains invalid characters")
    .transform(sanitizeString)
    .optional(),
  
  guest_limit: z.number()
    .min(1, "Minimum 1 guest required")
    .max(1000, "Maximum 1000 guests allowed")
    .default(50),
});

// Profile validation schema
export const secureProfileSchema = z.object({
  first_name: z.string()
    .max(50, "First name must be less than 50 characters")
    .regex(nameRegex, "First name contains invalid characters")
    .transform(sanitizeString)
    .optional(),
  
  last_name: z.string()
    .max(50, "Last name must be less than 50 characters")
    .regex(nameRegex, "Last name contains invalid characters")
    .transform(sanitizeString)
    .optional(),
  
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .optional(),
  
  mobile: z.string()
    .optional()
    .refine(val => !val || phoneRegex.test(val.replace(/\s/g, "")), 
      "Invalid phone number format")
    .transform(val => val ? val.replace(/\s/g, "") : undefined),
});

// Custom role validation
export const customRoleSchema = z.string()
  .min(1, "Role name is required")
  .max(30, "Role name must be less than 30 characters")
  .regex(/^[a-zA-Z\s\-']{1,30}$/, "Role name contains invalid characters")
  .transform(sanitizeString);

// QR Code settings validation
export const qrSettingsSchema = z.object({
  scan_text: z.string()
    .max(20, "Scan text must be less than 20 characters")
    .transform(sanitizeString)
    .default("SCAN ME"),
  
  background_color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
  
  foreground_color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"),
});

// Input sanitization utilities
export const sanitizeInput = {
  text: (input: string, maxLength: number = 255): string => {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, maxLength);
  },
  
  phone: (input: string): string => {
    return input.replace(/[^\d\+\-\(\)\s]/g, '');
  },
  
  name: (input: string): string => {
    return input
      .trim()
      .replace(/[^a-zA-Z\s\-'\.àáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžæ]/g, '')
      .substring(0, 50);
  }
};

export type SecureGuestData = z.infer<typeof secureGuestSchema>;
export type SecureTableData = z.infer<typeof secureTableSchema>;
export type SecureEmailData = z.infer<typeof secureEmailSchema>;
export type SecureEventData = z.infer<typeof secureEventSchema>;
export type SecureProfileData = z.infer<typeof secureProfileSchema>;