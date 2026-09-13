import { useAuthenticatedSession } from '@/contexts/AuthenticatedSessionContext';
import { Button } from '@/components/ui/button';
import type { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { usePlaceCardScopedImageFit } from '@/hooks/usePlaceCardScopedImageFit';
import { makePlaceCardFitSnapshot, readPlaceCardScopedFit } from '@/lib/placeCardScopedImageFit';

/** Interface only. Never changes printable geometry or imports browser history. */
export function PlaceCardScopedFitSync({ ownerId, eventId, settings, visibleFit, onUseSavedFit }: {
  ownerId: string; eventId: string; settings: PlaceCardSettings | null; visibleFit: 'cover' | 'contain'; onUseSavedFit: (fit: 'cover' | 'contain') => void;
}) {
  const { session } = useAuthenticatedSession();
  const state = usePlaceCardScopedImageFit(session?.user.id ?? null, ownerId, eventId);
  const actual = settings && !!ownerId && settings.user_id === ownerId && settings.event_id === eventId ? settings : null;
  const snapshot = makePlaceCardFitSnapshot(actual, visibleFit), savedFit = readPlaceCardScopedFit(state.record, actual);
  if (!snapshot) return null;
  return <section aria-label="Saved place card crop" className="print:hidden rounded-lg border border-[#d6bd96] bg-[#faf7ef] p-3 text-sm text-[#2f1b14]">
    <p>{savedFit ? `Recorded crop for this exact artwork: ${savedFit}. Your visible crop remains unchanged until you choose to use it.`
      : state.verified ? 'No matching synchronized crop is recorded for this artwork. Historical browser-only choices have not been imported.' : 'Checking this event’s saved crop…'}</p>
    {state.error && <p role="alert" className="mt-2">{state.error}</p>}
    <div className="mt-2 flex flex-wrap gap-2">
      <Button type="button" disabled={!state.verified || state.saving} onClick={() => void state.save(snapshot)}>{state.saving ? 'Saving…' : 'Save current crop for this event'}</Button>
      {savedFit && <Button type="button" variant="outline" disabled={state.saving} onClick={() => onUseSavedFit(savedFit)}>Use saved crop for this artwork</Button>}
      {state.error && <Button type="button" variant="outline" disabled={state.saving} onClick={state.reload}>Reload saved crop</Button>}
    </div>
  </section>;
}
