import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Users, TrendingUp } from 'lucide-react';
import type { QRScanStats } from '@/hooks/useDynamicQRCodes';

interface QRAnalyticsDashboardProps {
  qrCodeId: string;
  getScanStats: (id: string) => Promise<QRScanStats>;
}

export const QRAnalyticsDashboard: React.FC<QRAnalyticsDashboardProps> = ({ qrCodeId, getScanStats }) => {
  const [stats, setStats] = useState<QRScanStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getScanStats(qrCodeId).then(s => {
      setStats(s);
      setLoading(false);
    });
  }, [qrCodeId, getScanStats]);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-2">Loading analytics...</div>;
  }

  if (!stats || stats.total_scans === 0) {
    return <div className="text-sm text-muted-foreground py-2">No scans recorded yet.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Eye className="w-4 h-4 text-primary" />
          <div>
            <div className="text-lg font-bold text-foreground">{stats.total_scans}</div>
            <div className="text-xs text-muted-foreground">Total Scans</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Users className="w-4 h-4 text-primary" />
          <div>
            <div className="text-lg font-bold text-foreground">{stats.unique_visitors}</div>
            <div className="text-xs text-muted-foreground">Unique Visitors</div>
          </div>
        </div>
      </div>

      {stats.scans_by_day.length > 1 && (
        <div>
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
            <TrendingUp className="w-3 h-3" /> Scans Over Time
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={stats.scans_by_day}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis hide allowDecimals={false} />
              <Tooltip labelFormatter={(v) => v} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
