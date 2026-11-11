import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createCoalescedRead } from '@/lib/coalescedRead';
export type DJMCRowTextSizeValue = 'standard' | 'larger';
type Scope = { eventId: string; token?: string; value: DJMCRowTextSizeValue;
  confirmed: DJMCRowTextSizeValue; pending?: DJMCRowTextSizeValue; saving: boolean; revision: number; read: number; active: boolean };

export function useDJMCRowTextSize(eventId: string | null, token?: string, canEdit = true) {
  const [value, setValue] = useState<DJMCRowTextSizeValue>('standard');
  const [loading, setLoading] = useState(true);
  const scopeRef = useRef<Scope | null>(null);
  const editRef = useRef(canEdit); editRef.current = canEdit;
  const { toast } = useToast();
  const toastRef = useRef(toast); toastRef.current = toast;
  useEffect(() => {
    setValue('standard'); setLoading(!!eventId);
    if (!eventId) { scopeRef.current = null; return; }
    const scope: Scope = { eventId, token, value: 'standard', confirmed: 'standard', saving: false, revision: 0, read: 0, active: true };
    scopeRef.current = scope;
    const read = createCoalescedRead<any>();
    const refresh = async (invalidate: unknown = false) => {
      if (scope.saving || scope.pending) return;
      const request = ++scope.read, revision = scope.revision;
      let result;
      try {
        result = await read(eventId, () => (supabase.rpc as any)(token ? 'get_dj_mc_row_text_size_by_token' : 'get_dj_mc_row_text_size',
          token ? { share_token: token } : { p_event_id: eventId }), invalidate === true);
      } catch { return; }
      const { data, error } = result;
      if (!scope.active || request !== scope.read || revision !== scope.revision || scope.saving) return;
      if (error) return;
      scope.value = scope.confirmed = data === 'larger' ? 'larger' : 'standard';
      setValue(scope.value); setLoading(false);
    };
    refresh();
    const timer = window.setInterval(() => { if (document.visibilityState !== 'hidden') void refresh(); }, 15000);
    window.addEventListener('focus', refresh);
    const channel = supabase.channel(`djmc-row-text:${eventId}`).on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'dj_mc_questionnaires', filter: `event_id=eq.${eventId}`,
    }, () => { void refresh(true); }).subscribe();
    return () => { scope.active = false; clearInterval(timer); window.removeEventListener('focus', refresh); supabase.removeChannel(channel); };
  }, [eventId, token]);
  const change = (next: DJMCRowTextSizeValue) => {
    const scope = scopeRef.current;
    if (!scope || !scope.active || !editRef.current || scope.eventId !== eventId || scope.token !== token) return;
    scope.value = scope.pending = next; ++scope.revision; setValue(next);
    if (scope.saving) return;
    scope.saving = true;
    void (async () => {
      while (scope.pending && editRef.current) {
        const desired = scope.pending; scope.pending = undefined;
        try {
          const { data, error } = await (supabase.rpc as any)(scope.token ? 'save_dj_mc_row_text_size_by_token' : 'save_dj_mc_row_text_size',
            scope.token ? { share_token: scope.token, new_size: desired } : { p_event_id: scope.eventId, new_size: desired });
          if (error || data !== true) throw error || new Error('Failed to save');
          scope.confirmed = desired;
        } catch {
          if (!scope.pending && scope.active) { scope.value = scope.confirmed; setValue(scope.confirmed); }
          if (scope.active) toastRef.current({ title: 'Error', description: 'Failed to save settings. Please try again.', variant: 'destructive' });
        }
      }
      scope.saving = false;
    })();
  };
  return { rowTextSize: value, setRowTextSize: change, loading };
}
