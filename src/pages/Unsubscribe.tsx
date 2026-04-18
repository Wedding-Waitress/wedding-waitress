/**
 * Unsubscribe page — handles the token from email unsubscribe links.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: 'loading' }
  | { kind: 'valid' }
  | { kind: 'already' }
  | { kind: 'invalid' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid' });
      return;
    }
    (async () => {
      try {
        const url = `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY } });
        const data = await res.json();
        if (res.ok && data.valid) setState({ kind: 'valid' });
        else if (data.reason === 'already_unsubscribed') setState({ kind: 'already' });
        else setState({ kind: 'invalid' });
      } catch {
        setState({ kind: 'invalid' });
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState({ kind: 'submitting' });
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.success) setState({ kind: 'success' });
      else if (data.reason === 'already_unsubscribed') setState({ kind: 'already' });
      else setState({ kind: 'error', message: data.error || 'Could not unsubscribe.' });
    } catch {
      setState({ kind: 'error', message: 'Network error. Please try again.' });
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-4">
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3" style={{ color: '#3D2E1E' }}>
          Unsubscribe
        </h1>

        {state.kind === 'loading' && (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}

        {state.kind === 'valid' && (
          <>
            <p className="text-sm text-gray-600 mb-6">
              Click below to stop receiving emails from Wedding Waitress.
            </p>
            <Button
              onClick={confirm}
              className="w-full"
              style={{ backgroundColor: '#967A59', color: '#fff' }}
            >
              Confirm unsubscribe
            </Button>
          </>
        )}

        {state.kind === 'submitting' && (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}

        {state.kind === 'success' && (
          <p className="text-sm text-gray-700">
            You've been unsubscribed. We're sorry to see you go.
          </p>
        )}

        {state.kind === 'already' && (
          <p className="text-sm text-gray-700">You're already unsubscribed.</p>
        )}

        {state.kind === 'invalid' && (
          <p className="text-sm text-red-600">This unsubscribe link is invalid or has expired.</p>
        )}

        {state.kind === 'error' && (
          <p className="text-sm text-red-600">{state.message}</p>
        )}
      </div>
    </main>
  );
}
