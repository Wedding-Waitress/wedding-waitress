export const GUIDED_SETUP_AUDIO = Object.fromEntries(
  Array.from({ length: 10 }, (_, index) => {
    const step = String(index + 1).padStart(2, '0');
    const names = ['welcome', 'event-type', 'event-details', 'date-location', 'celebration-parts', 'guests', 'tables', 'budget', 'review', 'ready'];
    return [index + 1, `/audio/onboarding/step-${step}-${names[index]}.mp3`];
  }),
) as Record<number, string>;

// Set this when the approved explainer is supplied. A null value renders no
// empty player or placeholder on Step 10.
export const GUIDED_SETUP_READY_VIDEO: string | null = null;
