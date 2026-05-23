import { Card, CardContent } from '@/components/ui/card';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { useReceptionTables } from '@/hooks/useReceptionTables';

interface ReceptionFloorPlanPageProps {
  selectedEventId: string;
}

/**
 * Phase 1A — Step 2
 * Empty Reception scaffold. Loads synced tables into memory (read-only).
 * No editor / canvas yet — that arrives in Step 3.
 */
export const ReceptionFloorPlanPage = ({ selectedEventId }: ReceptionFloorPlanPageProps) => {
  const { tables, loading } = useReceptionTables(selectedEventId);

  return (
    <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Reception Floor Plan</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Phase 1A · Step 2 complete — synced tables are loaded from your Tables page.
          The editor canvas will appear in Step 3.
        </p>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading synced tables…
            </div>
          ) : tables.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tables found for this event. Add tables on the Tables page first.
            </p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {tables.length} synced table{tables.length === 1 ? '' : 's'} ready to place:
              </p>
              <ul className="text-sm text-muted-foreground list-disc pl-5">
                {tables.map((t) => (
                  <li key={t.id}>
                    {t.name || `Table ${t.table_no}`} · seats {t.limit_seats}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
