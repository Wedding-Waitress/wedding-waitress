import { useCallback, useRef } from 'react';
import { Loader2, MapPin } from 'lucide-react';

import { ReceptionFloorPlanCanvas } from '@/components/Dashboard/FloorPlan/ReceptionFloorPlan/ReceptionFloorPlanCanvas';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { useReceptionFloorPlanShare } from '@/hooks/useReceptionFloorPlanShare';

interface ReadOnlyReceptionFloorPlanProps {
  token?: string | null;
}

export const ReadOnlyReceptionFloorPlan = ({ token }: ReadOnlyReceptionFloorPlanProps) => {
  const { data, backgroundUrl, loading, error } = useReceptionFloorPlanShare(token || undefined);
  const a4Ref = useRef<HTMLDivElement>(null);
  const generatedAt = useRef(new Date());
  const preserveReadOnlyPlan = useCallback(
    (_mutator: (plan: ReceptionFloorPlan) => ReceptionFloorPlan) => undefined,
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground" role="status">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading reception floor plan…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-10 text-center text-muted-foreground" role="alert">
        <MapPin className="mx-auto mb-3 h-12 w-12 opacity-60" />
        <p className="font-medium text-foreground">Reception floor plan unavailable</p>
        <p className="mt-1 text-sm">{error || 'Ask your organiser to enable the read-only floor plan link.'}</p>
      </div>
    );
  }

  return (
    <ReceptionFloorPlanCanvas
      plan={data.plan}
      tables={data.tables}
      event={data.event}
      attendingCount={0}
      generatedAt={generatedAt.current}
      a4Ref={a4Ref}
      backgroundUrl={backgroundUrl}
      onChange={preserveReadOnlyPlan}
      readOnly
    />
  );
};
