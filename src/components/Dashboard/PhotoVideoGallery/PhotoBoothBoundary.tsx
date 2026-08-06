import React from 'react';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Local boundary for the guest Photo Booth.
 *
 * A failed lazy-chunk load (common on first open over a slow/flaky connection) used to bubble
 * up to the app-wide error boundary, which forced guests to refresh the whole page. This boundary
 * keeps the failure local and offers an in-app Retry that remounts the Photo Booth only — the
 * guest's event, token and session state are preserved.
 */
interface Props {
  accent: string;
  /** Either static children, or a render function receiving the current retry attempt so the
   *  caller can rebuild a fresh React.lazy() (React caches rejected lazy promises forever). */
  children: React.ReactNode | ((attempt: number) => React.ReactNode);
}

interface State {
  hasError: boolean;
}

class PhotoBoothErrorBoundaryInner extends React.Component<Props & { onRetry: () => void }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Photo Booth failed to initialise:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="py-10 flex justify-center">
          <div className="max-w-md w-full rounded-2xl border-2 border-[#967A59] bg-white/95 p-7 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">We couldn’t open the Photo Booth</h2>
            <p className="text-sm text-[#6E6E73]">Something unexpected happened while preparing the Photo Booth.</p>
            <Button
              type="button"
              className="lv-premium-shade mt-5 h-11 w-full text-white"
              style={{ backgroundColor: this.props.accent }}
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onRetry();
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const PhotoBoothPreparing: React.FC<{ accent: string }> = ({ accent }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12" role="status" aria-live="polite">
    <Loader2 className="animate-spin h-8 w-8" style={{ color: accent }} />
    <p className="text-base font-medium text-white">Opening Photo Booth…</p>
  </div>
);

export const PhotoBoothBoundary: React.FC<Props> = ({ accent, children }) => {
  const [attempt, setAttempt] = React.useState(0);
  return (
    <PhotoBoothErrorBoundaryInner key={attempt} accent={accent} onRetry={() => setAttempt(n => n + 1)}>
      <React.Suspense fallback={<PhotoBoothPreparing accent={accent} />}>{children}</React.Suspense>
    </PhotoBoothErrorBoundaryInner>
  );
};
