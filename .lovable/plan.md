## Stage 2 — Get Help Modal System

Note: `src/components/ContactForm.tsx` and the `contact-form-message` email template are PRODUCTION-LOCKED. We do not modify them. Instead, we reuse their submission backend (Supabase Edge Function `send-transactional-email` + template `contact-form-message`) so every Get Help submission lands in the same support inbox and any future routing/automation/AI/GoHighLevel/ElevenLabs work plugged into that pipeline automatically applies here too.

### 1. Replace the Stage 1 placeholder

In `src/components/Dashboard/AppSidebar.tsx`:
- Remove only the `'help'` branch from the shared placeholder dialog (keep `'upgrade'` and `'referral'` placeholders untouched).
- The "Get Help" dropdown item now opens the new `GetHelpModal` via local state (`helpOpen`).
- Keep icon (`LifeBuoy`), label, ordering, and all sidebar/responsive behaviour exactly as Stage 1.

### 2. New component: `src/components/Support/GetHelpModal.tsx`

Built on shadcn `<Dialog>` to match the rest of the app.

Props:
```ts
{ open: boolean; onOpenChange: (o: boolean) => void }
```

Layout (top → bottom):
1. Header — title "Get Help" + subtitle "We typically reply within 24 hours."
2. Category selector — section label "What do you need help with?" + responsive pill grid:
   - `grid grid-cols-2 sm:grid-cols-3 gap-2` on desktop/tablet, `grid-cols-1 gap-2` on mobile (per Mobile UI rules).
   - Eight options, each a button styled as a pill (rounded-full, `min-h-11` for touch targets, `lv-premium-shade`):
     - Report a Bug
     - Request a Feature
     - Billing Question
     - Urgent Wedding Day Support
     - General Help
     - Technical Problem
     - Account Access Issue
     - SMS/Email Delivery Issue
   - Selected pill: brown filled (`bg-[#967A59] text-white`); idle: outline.
   - Single-select. Selection is required to submit.
3. Form fields (full-width, `h-11 text-base`):
   - Full Name (prefilled from `useProfile()` first+last name).
   - Email (prefilled from `useProfile().email` or `supabase.auth.getUser()`).
   - Message textarea (5 rows, max 2000 chars, required).
4. Footer — sticky on mobile (`max-lg:sticky bottom-0 bg-background pt-3`):
   - Send button (left, brown primary, `lv-premium-shade`, full width on mobile, `h-11`).
   - Cancel button (right, outline, `lv-premium-shade`).

Validation (zod, mirrors ContactForm constraints):
```ts
const helpSchema = z.object({
  category: z.enum([...8 categories]),
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(1).max(2000),
});
```

Submission — reuse existing pipeline:
```ts
await supabase.functions.invoke("send-transactional-email", {
  body: {
    templateName: "contact-form-message",
    recipientEmail: "support@weddingwaitress.com.au",
    idempotencyKey: `support-${crypto.randomUUID()}`,
    templateData: {
      name: result.data.fullName,
      email: result.data.email,
      eventType: `Support Request — ${result.data.category}`,
      message:
        `[Support Category] ${result.data.category}\n` +
        `[Source] In-app Get Help modal\n` +
        `[User ID] ${userId ?? '—'}\n` +
        `[Plan] ${planDisplayName}\n\n` +
        result.data.message,
      date: new Date().toISOString(),
    },
  },
});
```

This keeps a single backend, single inbox, and the category is preserved both in the subject-adjacent `eventType` line AND as a structured tag inside the message body — ready for future ticket parsing / AI routing / urgency detection without any backend change today.

On success: `toast.success("Your support request has been sent. We'll reply within 24 hours.")`, reset state, close modal.
On error: `toast.error("Something went wrong. Please try again or email support@weddingwaitress.com.au")`.

### 3. Smart defaults

- Use existing `useProfile()` hook (already imported in AppSidebar — pass values down OR re-fetch inside modal).
- Email fallback: `supabase.auth.getUser()` when profile lacks email.
- Pre-fill is editable (user can override).

### 4. Responsive rules (per Mobile UI memory)

- Title centered + X close on its own row on mobile (`max-lg:`).
- Inputs full-width, `h-11`, `text-base`.
- 16–20px gaps between sections (`max-lg:gap-5`).
- Sticky footer on mobile.
- `Dialog` content uses `max-w-lg sm:max-w-xl`, `max-h-[90vh] overflow-y-auto`.
- No horizontal scroll.

### 5. Future-ready (structure only — not implemented now)

- Component accepts an internal `category` enum that future ticket-routing logic can read.
- `templateData` includes `[User ID]`, `[Plan]`, `[Source]` tags — gives future GoHighLevel / AI / urgency router everything it needs.
- Single component, single submission path → swap `send-transactional-email` for a richer ticket function later without touching UI.
- No premature abstractions: no ticket IDs, no chat, no history UI yet.

### 6. Out of scope

- ContactForm.tsx (locked, untouched).
- Email template (locked, untouched).
- Stripe, pricing, referral, upgrade, intercom/external systems.
- Sidebar behaviour beyond rewiring the Help item's onClick.

### Files

- New: `src/components/Support/GetHelpModal.tsx` (~180 lines).
- Edited: `src/components/Dashboard/AppSidebar.tsx` (~10 lines: import, state, dropdown onClick, render `<GetHelpModal>`, drop `'help'` from placeholder copy map).
