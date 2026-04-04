import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Module-level cache for instant loading
let statsCache: { totalUsers: number; totalEvents: number } | null = null;

export const AdminOverview = () => {
  const [stats, setStats] = useState(statsCache ?? {
    totalUsers: 0,
    totalEvents: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(!statsCache);

  // Keep cache in sync
  useEffect(() => {
    if (stats.totalUsers > 0 || stats.totalEvents > 0) statsCache = stats;
  }, [stats]);

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, []);

  const fetchStats = async () => {
    try {
      // Total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total events
      const { count: eventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: userCount || 0,
        totalEvents: eventCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    // Chart data removed - no media tracking
    setChartData([]);
  };

  const kpis = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#6D28D9' },
    { label: 'Total Events', value: stats.totalEvents, icon: Calendar, color: '#6D28D9' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#6D28D9' }}></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="ww-box">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <Icon className="w-5 h-5" style={{ color: kpi.color }} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: '#6D28D9' }}>
                  {kpi.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart - Removed */}
    </div>
  );
};
