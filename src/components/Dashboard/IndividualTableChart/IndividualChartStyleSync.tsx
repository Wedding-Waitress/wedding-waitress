import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSession } from '@/contexts/AuthenticatedSessionContext';
import { useIndividualTableChartSettings } from '@/hooks/useIndividualTableChartSettings';
import type { PersistedIndividualChartSettings } from '@/lib/individualTableChartPersistence';
import type { IndividualChartSettings } from './IndividualTableSeatingChartPage';

interface Props {
  ownerId: string;
  eventId: string;
  settings: IndividualChartSettings;
  editRevision: number;
  onVerifiedLoad: (settings: PersistedIndividualChartSettings) => void;
}

/** Interface-only controls; never included in the authoritative print/PDF document. */
export function IndividualChartStyleSync({ ownerId, eventId, settings, editRevision, onVerifiedLoad }: Props) {
  const { session } = useAuthenticatedSession();
  const state = useIndividualTableChartSettings(session?.user.id ?? null, ownerId, eventId, true);
  const initialEditRevision = useRef(editRevision);
  const applied = useRef<number | null>(null);
  useEffect(() => {
    if (!state.snapshot || applied.current === state.snapshot.revision) return;
    applied.current = state.snapshot.revision;
    // An asynchronous server load must not overwrite a customer's intervening visible edits.
    if (editRevision === initialEditRevision.current) onVerifiedLoad(state.snapshot.settings);
  }, [state.snapshot, editRevision, onVerifiedLoad]);

  return <section aria-label="Saved chart style" className="print:hidden rounded-lg border border-[#d6bd96] bg-[#faf7ef] p-3 text-sm text-[#2f1b14]">
    <p>{state.loading ? 'Checking this event’s saved chart style…'
      : state.snapshot ? 'This event has a saved chart style. Save again to keep your current visible changes.'
        : 'No synchronized chart style is recorded for this event. Historical browser-only settings cannot be recovered here. Your visible chart is unchanged.'}</p>
    {state.error && <p role="alert" className="mt-2">{state.error}</p>}
    <div className="mt-2 flex flex-wrap gap-2">
      <Button type="button" disabled={!state.verified || state.loading || state.saving}
        onClick={() => { void state.save(settings); }}>
        {state.saving ? 'Saving…' : 'Save visible style for this event'}
      </Button>
      {state.error && <Button type="button" variant="outline" disabled={state.saving} onClick={state.reload}>Reload saved style</Button>}
    </div>
  </section>;
}
