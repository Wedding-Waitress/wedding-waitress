
The plan is to implement the new combined pricing structure for RSVP invitations. We will transition from separate pricing for Email and SMS to a single "RSVP Invite Bundle" that includes both channels. This involves updating the pricing calculation logic and modifying the user interface to clearly communicate the combined value to the event organizers.

### 1. Update Pricing Logic
I will modify the `getPricingTier` function in `src/components/Dashboard/SendRsvpConfirmModal.tsx` to reflect the new tiers provided:
*   1–100 guests: $99 AUD
*   101–200 guests: $129 AUD
*   201–300 guests: $149 AUD
*   301–400 guests: $159 AUD
*   401–500 guests: $199 AUD
*   501–1000 guests: $299 AUD

### 2. Unified Modal Interface
The `SendRsvpConfirmModal` will be updated to reflect the combined nature of the service:
*   The title will be updated to "RSVP Invite Bundle (Email & SMS)".
*   The pricing section will explicitly state that the one-time charge covers both Email and SMS invitations for the event.
*   The summary section will still show how many guests will receive the specific channel currently being triggered (Email or SMS) and who will be skipped, but the price displayed will always be the combined bundle price.

### 3. Maintain Sending Workflow
I will preserve the existing "Send Email" and "Send SMS" triggers in the bulk actions bar and the table interface. This allows users to choose which channel to dispatch at any given moment, even though the payment unlocks both simultaneously.

### Technical Details

#### `src/components/Dashboard/SendRsvpConfirmModal.tsx`
*   Update `getPricingTier` function to use the new guest count ranges and price points.
*   Update `DialogTitle` to show the unified bundle branding.
*   Refine the pricing info text to clarify that it's a "Combined pricing for both Email & SMS".
*   Update the "Will send to" badges to maintain clarity on the specific action being taken (e.g., "Will send email to:").

#### Verification
*   Open the Guest List.
*   Select guests and click "Send Email" or "Send SMS".
*   Verify that the modal displays the new tiered pricing based on the *total* guest count of the event.
*   Confirm the price matches the new $99, $129, etc., tiers.
*   Check that the UI clearly indicates both channels are included in the price.

This implementation focuses on the frontend pricing display and confirmation flow as requested. Actual enforcement of payment/credits in the Edge Functions or a separate "Activation" page can be handled in a subsequent step if needed.

