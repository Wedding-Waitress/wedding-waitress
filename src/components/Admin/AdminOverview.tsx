import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Image, Video, Mic, HardDrive, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminOverview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalPhotos: 0,
    totalVideos: 0,
    totalAudio: 0,
    storageGB: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Media counts
      const { data: mediaStats } = await supabase
        .from('media_uploads')
        .select('post_type, file_size_bytes');

      let photos = 0, videos = 0, audio = 0, totalBytes = 0;
      
      mediaStats?.forEach((item) => {
        if (item.post_type === 'photo') photos++;
        else if (item.post_type === 'video') videos++;
        else if (item.post_type === 'audio') audio++;
        totalBytes += item.file_size_bytes || 0;
      });

      setStats({
        totalUsers: userCount || 0,
        totalEvents: eventCount || 0,
        totalPhotos: photos,
        totalVideos: videos,
        totalAudio: audio,
        storageGB: (totalBytes / (1024 * 1024 * 1024)).toFixed(2) as any,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      // Last 30 days of uploads
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('media_uploads')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Group by day
      const dailyCounts: Record<string, number> = {};
      data?.forEach((item) => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      const chartArray = Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, uploads: count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setChartData(chartArray);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const kpis = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#6D28D9' },
    { label: 'Total Events', value: stats.totalEvents, icon: Calendar, color: '#6D28D9' },
    { label: 'Total Photos', value: stats.totalPhotos, icon: Image, color: '#6D28D9' },
    { label: 'Total Videos', value: stats.totalVideos, icon: Video, color: '#6D28D9' },
    { label: 'Total Audio', value: stats.totalAudio, icon: Mic, color: '#6D28D9' },
    { label: 'Storage Used', value: `${stats.storageGB} GB`, icon: HardDrive, color: '#6D28D9' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#6D28D9' }}></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Chart */}
      <Card className="ww-box">
        <CardHeader>
          <CardTitle style={{ color: '#6D28D9' }}>
            <TrendingUp className="w-5 h-5 inline mr-2" />
            Daily Uploads (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="uploads" stroke="#6D28D9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
