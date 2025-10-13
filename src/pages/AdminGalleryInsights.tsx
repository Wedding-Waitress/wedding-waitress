import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Share2, Download, Loader2, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface GalleryInsight {
  gallery_id: string;
  gallery_title: string;
  event_name: string | null;
  event_date: string | null;
  total_views: number;
  unique_sessions: number;
  total_shares: number;
  total_downloads: number;
  last_activity: string | null;
  owner_email: string | null;
}

export const AdminGalleryInsights: React.FC = () => {
  const [insights, setInsights] = useState<GalleryInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();

    // Set up real-time updates
    const channel = supabase
      .channel('admin-analytics-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gallery_analytics',
        },
        () => {
          fetchInsights();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInsights = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_gallery_analytics');

      if (error) throw error;

      setInsights(data || []);
    } catch (error) {
      console.error('Error fetching gallery insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalViews = insights.reduce((sum, item) => sum + (item.unique_sessions || 0), 0);
  const totalShares = insights.reduce((sum, item) => sum + (item.total_shares || 0), 0);
  const totalDownloads = insights.reduce((sum, item) => sum + (item.total_downloads || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Gallery Analytics Dashboard</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="ww-box">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-3xl font-bold">{totalViews}</p>
                </div>
                <Eye className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="ww-box">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Shares</p>
                  <p className="text-3xl font-bold">{totalShares}</p>
                </div>
                <Share2 className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="ww-box">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Downloads</p>
                  <p className="text-3xl font-bold">{totalDownloads}</p>
                </div>
                <Download className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card className="ww-box">
          <CardHeader>
            <CardTitle>Gallery Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : insights.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No gallery data available yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gallery / Event</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Event Date</TableHead>
                      <TableHead className="text-center">Views</TableHead>
                      <TableHead className="text-center">Shares</TableHead>
                      <TableHead className="text-center">Downloads</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insights.map((insight) => (
                      <TableRow key={insight.gallery_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{insight.gallery_title}</p>
                            {insight.event_name && (
                              <p className="text-sm text-muted-foreground">{insight.event_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{insight.owner_email || 'N/A'}</TableCell>
                        <TableCell className="text-sm">
                          {insight.event_date ? format(new Date(insight.event_date), 'PP') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {insight.unique_sessions || 0}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {insight.total_shares || 0}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {insight.total_downloads || 0}
                        </TableCell>
                        <TableCell className="text-sm">
                          {insight.last_activity
                            ? format(new Date(insight.last_activity), 'PPp')
                            : 'No activity'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
